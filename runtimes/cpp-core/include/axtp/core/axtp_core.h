#pragma once

#include <cstddef>
#include <functional>
#include <optional>
#include <queue>
#include <utility>

#include "axtp/broker/axtp_broker.h"
#include "axtp/broker/broker_sink.h"
#include "axtp/core/control_session.h"
#include "axtp/core/pending_call_table.h"
#include "axtp/core/stream_session.h"
#include "axtp/inbound/axtp_inbound_processor.h"
#include "axtp/io/byte_sink.h"
#include "axtp/io/byte_writer_sink.h"
#include "axtp/outbound/axtp_outbound_processor.h"
#include "axtp/transport/transport.h"

namespace axtp {

class AxtpCore : public IPayloadSink, public IByteSink, public IByteWriter, public IBrokerSink {
public:
    AxtpCore()
        : inbound_(*this), outbound_(*this) {}

    void onBytes(const Byte* data, std::size_t size) override {
        inbound_.onBytes(data, size);
    }

    void writeBytes(const Byte* data, std::size_t size) override {
        outboundQueue_.push(Bytes(data, data + size));
    }

    void onControl(ControlPayload payload) override {
        auto response = controlSession_.handle(std::move(payload));
        if (response.has_value()) {
            outbound_.sendControl(std::move(*response));
        }
    }

    void onRpc(RpcPayload payload) override {
        if (payload.op == RpcOp::Request) {
            if (broker_ != nullptr) {
                BrokerTask task;
                task.type = BrokerTaskType::RpcRequest;
                task.context.sessionId = payload.meta.sessionId;
                task.context.requestId = payload.requestId;
                task.context.methodOrEventId = payload.methodOrEventId;
                task.context.encoding = payload.encoding;
                task.context.sourceProtocol = payload.meta.sourceProtocol;
                task.rpc = std::move(payload);
                broker_->submit(std::move(task));
            }
            return;
        }

        if (payload.op == RpcOp::Event) {
            if (broker_ != nullptr) {
                BrokerTask task;
                task.type = BrokerTaskType::RpcEvent;
                task.context.sessionId = payload.meta.sessionId;
                task.context.methodOrEventId = payload.methodOrEventId;
                task.context.encoding = payload.encoding;
                task.context.sourceProtocol = payload.meta.sourceProtocol;
                task.rpc = std::move(payload);
                broker_->submit(std::move(task));
            }
            return;
        }

        if (payload.op == RpcOp::RequestResponse) {
            pendingCalls_.resolve(payload.requestId, std::move(payload));
        }
    }

    void onStream(StreamPayload payload) override {
        streamSession_.handle(std::move(payload));
    }

    void expectRpcResponse(std::uint32_t requestId) {
        pendingCalls_.expect(requestId);
    }

    std::optional<RpcPayload> tryTakeRpcResponse(std::uint32_t requestId) {
        return pendingCalls_.tryTakeResolved(requestId);
    }

    std::optional<Bytes> tryPopOutboundBytes() {
        if (outboundQueue_.empty()) {
            return std::nullopt;
        }
        auto bytes = std::move(outboundQueue_.front());
        outboundQueue_.pop();
        return bytes;
    }

    void attachTransport(ITransport& transport) {
        transport_ = &transport;
        transport_->bind(*this);
    }

    void attachBroker(AxtpBroker& broker) {
        broker_ = &broker;
    }

    void flushOutbound() {
        while (auto bytes = tryPopOutboundBytes()) {
            if (transport_ != nullptr) {
                transport_->sendBytes(bytes->data(), bytes->size());
            }
        }
    }

    bool controlSessionOpen() const {
        return controlSession_.isOpen();
    }

    void onBrokerRpcResponse(RpcPayload payload) override {
        outbound_.sendRpcResponse(std::move(payload));
    }

    void onBrokerRpcError(RpcPayload payload) override {
        outbound_.sendRpcError(std::move(payload));
    }

    void onBrokerEvent(RpcPayload payload) override {
        outbound_.sendEvent(std::move(payload));
    }

    void onBrokerStream(StreamPayload payload) override {
        outbound_.sendStream(std::move(payload));
    }

private:
    AxtpInboundProcessor inbound_;
    AxtpOutboundProcessor outbound_;
    ControlSession controlSession_;
    StreamSession streamSession_;
    PendingCallTable pendingCalls_;
    std::queue<Bytes> outboundQueue_;
    ITransport* transport_ = nullptr;
    AxtpBroker* broker_ = nullptr;
};

} // namespace axtp
