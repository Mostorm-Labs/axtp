#pragma once

#include <cstddef>
#include <utility>

#include "axtp/io/byte_writer_sink.h"
#include "axtp/outbound/frame_encoder.h"
#include "axtp/outbound/message_fragmenter.h"
#include "axtp/outbound/payload_encoder.h"
#include "axtp/transport/json_rpc_encoder.h"
#include "axtp/transport/transport_profile.h"

namespace axtp {

class AxtpOutboundProcessor {
public:
    explicit AxtpOutboundProcessor(IByteWriter& writer,
                                   std::size_t maxFrameSize = 4096,
                                   AxtpWireMode wireMode = AxtpWireMode::FramedBinary)
        : writer_(writer), messageFragmenter_(maxFrameSize), wireMode_(wireMode) {}

    void sendControl(ControlPayload payload) {
        if (wireMode_ == AxtpWireMode::WebSocketJsonRpc) {
            return;
        }
        sendMessage(payloadEncoder_.encodeControl(payload));
    }

    void sendRpcRequest(RpcPayload payload) {
        sendRpc(std::move(payload));
    }

    void sendRpcResponse(RpcPayload payload) {
        sendRpc(std::move(payload));
    }

    void sendRpcError(RpcPayload payload) {
        sendRpc(std::move(payload));
    }

    void sendEvent(RpcPayload payload) {
        sendRpc(std::move(payload));
    }

    void sendStream(StreamPayload payload) {
        if (wireMode_ == AxtpWireMode::WebSocketJsonRpc) {
            return;
        }
        sendMessage(payloadEncoder_.encodeStream(payload));
    }

    void sendRpc(RpcPayload payload) {
        if (wireMode_ == AxtpWireMode::WebSocketJsonRpc) {
            auto bytes = jsonRpcEncoder_.encode(std::move(payload));
            writer_.writeBytes(bytes.data(), bytes.size());
            return;
        }
        sendMessage(payloadEncoder_.encodeRpc(payload));
    }

    void setWireMode(AxtpWireMode wireMode) {
        wireMode_ = wireMode;
    }

private:
    void sendMessage(Message message) {
        auto frames = messageFragmenter_.fragment(std::move(message));
        for (const auto& frame : frames) {
            auto bytes = frameEncoder_.encode(frame);
            writer_.writeBytes(bytes.data(), bytes.size());
        }
    }

    IByteWriter& writer_;
    PayloadEncoder payloadEncoder_;
    MessageFragmenter messageFragmenter_;
    FrameEncoder frameEncoder_;
    JsonRpcEncoder jsonRpcEncoder_;
    AxtpWireMode wireMode_ = AxtpWireMode::FramedBinary;
};

} // namespace axtp
