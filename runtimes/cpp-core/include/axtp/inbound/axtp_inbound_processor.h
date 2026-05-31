#pragma once

#include "axtp/inbound/frame_decoder.h"
#include "axtp/inbound/message_reassembler.h"
#include "axtp/inbound/payload_decoder.h"
#include "axtp/io/byte_sink.h"
#include "axtp/transport/json_rpc_decoder.h"
#include "axtp/transport/transport_profile.h"

namespace axtp {

class AxtpInboundProcessor : public IByteSink {
public:
    explicit AxtpInboundProcessor(IPayloadSink& sink, AxtpWireMode wireMode = AxtpWireMode::FramedBinary)
        : payloadDecoder_(sink),
          messageReassembler_(payloadDecoder_),
          frameDecoder_(messageReassembler_),
          jsonRpcDecoder_(sink),
          wireMode_(wireMode) {}

    void onBytes(const Byte* data, std::size_t size) override {
        if (wireMode_ == AxtpWireMode::WebSocketJsonRpc) {
            jsonRpcDecoder_.onBytes(data, size);
            return;
        }
        frameDecoder_.onBytes(data, size);
    }

    void setWireMode(AxtpWireMode wireMode) {
        wireMode_ = wireMode;
    }

private:
    PayloadDecoder payloadDecoder_;
    MessageReassembler messageReassembler_;
    FrameDecoder frameDecoder_;
    JsonRpcDecoder jsonRpcDecoder_;
    AxtpWireMode wireMode_ = AxtpWireMode::FramedBinary;
};

} // namespace axtp
