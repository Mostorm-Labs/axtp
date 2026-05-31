#pragma once

#include <cstdint>
#include <limits>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#include <boost/json.hpp>

#include "axtp/broker/axtp_broker.h"
#include "axtp/core/axtp_core.h"
#include "axtp/core/session_context.h"
#include "axtp/inbound/axtp_inbound_processor.h"
#include "axtp/io/byte_sink.h"
#include "axtp/io/byte_writer.h"
#include "axtp/outbound/axtp_outbound_processor.h"
#include "axtp/transport/json_rpc_encoder.h"
#include "axtp/transport/transport.h"
#include "axtp/transport/websocket_transport.h"

namespace axtp {

class WebSocketJsonRpcAdapter : public IByteSink, public IProtocolOutbound {
public:
    WebSocketJsonRpcAdapter(AxtpCore& core, ITransport& writer, AxtpBroker* broker = nullptr)
        : core_(core),
          writer_(writer),
          broker_(broker),
          writerPort_(writer_),
          outbound_(writerPort_, 4096, AxtpWireMode::WebSocketJsonRpc),
          decoder_(captureSink_, AxtpWireMode::WebSocketJsonRpc) {
        core_.attachJsonRpcOutbound(*this);
    }

    void poll(WebSocketTransport& transport) {
        const bool hadConnection = transport.hasConnection();
        transport.poll();
        if (!hadConnection && transport.hasConnection()) {
            helloSent_ = false;
            identified_ = false;
            sid_ = makeSessionId();
        }
        if (transport.hasConnection()) {
            sendHelloOnce();
        }
    }

    void onBytes(const Byte* data, std::size_t size) override {
        try {
            const std::string text(reinterpret_cast<const char*>(data), size);
            const auto parsed = boost::json::parse(text);
            const auto& object = parsed.as_object();
            const auto op = parseOp(object);

            if (op == RpcOp::Identify || op == RpcOp::Reidentify) {
                handleIdentify(object);
                return;
            }
            if (!identified_ && (op == RpcOp::Request || op == RpcOp::RequestBatch)) {
                sendError(parseSid(object), parseRequestId(object), ErrorCode::ControlOpenRequired, op);
                return;
            }
            if (op == RpcOp::RequestBatch) {
                sendError(parseSid(object), parseRequestId(object), ErrorCode::RpcBatchUnsupported, op);
                return;
            }

            captureSink_.rpcs.clear();
            decoder_.onBytes(data, size);
            for (auto& rpc : captureSink_.rpcs) {
                if (rpc.op == RpcOp::RequestResponse || rpc.op == RpcOp::RequestBatchResponse) {
                    sendRpc(std::move(rpc));
                    continue;
                }
                core_.payloadSinkPort().onRpc(std::move(rpc));
            }
            if (broker_ != nullptr) {
                broker_->poll();
            }
        } catch (const std::exception&) {
            sendError("", 0, ErrorCode::RpcPayloadInvalid, RpcOp::Request);
        }
    }

    void sendRpc(RpcPayload payload) override {
        outbound_.sendRpc(std::move(payload));
    }

    void sendEvent(RpcPayload payload) {
        payload.encoding = RpcEncoding::Json;
        payload.op = RpcOp::Event;
        payload.meta.sourceProtocol = SourceProtocol::JsonRpc;
        sendRpc(std::move(payload));
    }

private:
    struct CapturingPayloadSink : IPayloadSink {
        std::vector<RpcPayload> rpcs;

        void onControl(ControlPayload) override {}
        void onRpc(RpcPayload payload) override {
            rpcs.push_back(std::move(payload));
        }
        void onStream(StreamPayload) override {}
    };

    class TransportByteWriter : public IByteWriter {
    public:
        explicit TransportByteWriter(ITransport& transport)
            : transport_(transport) {}

        void writeBytes(const Byte* data, std::size_t size) override {
            transport_.sendBytes(data, size);
        }

    private:
        ITransport& transport_;
    };

    static RpcOp parseOp(const boost::json::object& object) {
        const auto raw = object.at("op").as_int64();
        if (raw < 0 || raw > std::numeric_limits<std::uint8_t>::max()) {
            throw std::invalid_argument("invalid op");
        }
        return static_cast<RpcOp>(static_cast<std::uint8_t>(raw));
    }

    static std::string parseSid(const boost::json::object& object) {
        if (!object.contains("sid") || !object.at("sid").is_string()) {
            return "";
        }
        return std::string(object.at("sid").as_string());
    }

    static std::uint32_t parseRequestId(const boost::json::object& object) {
        if (!object.contains("d") || !object.at("d").is_object()) {
            return 0;
        }
        const auto& d = object.at("d").as_object();
        if (!d.contains("id")) {
            return 0;
        }
        const auto& id = d.at("id");
        if (id.is_uint64()) {
            const auto raw = id.as_uint64();
            return raw <= std::numeric_limits<std::uint32_t>::max() ? static_cast<std::uint32_t>(raw) : 0;
        }
        if (id.is_int64()) {
            const auto raw = id.as_int64();
            return raw > 0 && raw <= std::numeric_limits<std::uint32_t>::max()
                       ? static_cast<std::uint32_t>(raw)
                       : 0;
        }
        return 0;
    }

    void sendHelloOnce() {
        if (helloSent_) {
            return;
        }
        sendRpc(JsonRpcEncoder::makeHello());
        helloSent_ = true;
    }

    void handleIdentify(const boost::json::object& object) {
        const auto& d = object.at("d").as_object();
        if (const auto* resumeSid = d.if_contains("resumeSid");
            resumeSid != nullptr && resumeSid->is_string() && !resumeSid->as_string().empty()) {
            sid_ = std::string(resumeSid->as_string());
        }
        identified_ = true;
        sendRpc(JsonRpcEncoder::makeIdentified(sid_));
    }

    void sendError(const std::string& sid, std::uint32_t requestId, ErrorCode code, RpcOp requestOp) {
        RpcPayload response;
        response.encoding = RpcEncoding::Json;
        response.op = requestOp == RpcOp::RequestBatch ? RpcOp::RequestBatchResponse : RpcOp::RequestResponse;
        response.requestId = requestId;
        response.statusCode = code;
        response.bodyEncoding = RpcBodyEncoding::RawBytes;
        response.meta.sourceProtocol = SourceProtocol::JsonRpc;
        response.meta.jsonSid = sid.empty() ? sid_ : sid;
        sendRpc(std::move(response));
    }

    std::string makeSessionId() {
        return std::to_string(nextSessionId_++);
    }

    AxtpCore& core_;
    ITransport& writer_;
    AxtpBroker* broker_ = nullptr;
    CapturingPayloadSink captureSink_;
    TransportByteWriter writerPort_;
    AxtpOutboundProcessor outbound_;
    AxtpInboundProcessor decoder_;
    bool helloSent_ = false;
    bool identified_ = false;
    std::uint32_t nextSessionId_ = 1;
    std::string sid_ = makeSessionId();
};

} // namespace axtp
