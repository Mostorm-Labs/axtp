#pragma once

#include "axtp/inbound/frame_decoder.h"
#include "axtp/inbound/message_reassembler.h"
#include "axtp/inbound/payload_decoder.h"
#include "axtp/io/byte_sink.h"

namespace axtp {

class AxtpInboundProcessor : public IByteSink {
public:
    explicit AxtpInboundProcessor(IPayloadSink& sink)
        : payloadDecoder_(sink),
          messageReassembler_(payloadDecoder_),
          frameDecoder_(messageReassembler_) {}

    void onBytes(const Byte* data, std::size_t size) override {
        frameDecoder_.onBytes(data, size);
    }

private:
    PayloadDecoder payloadDecoder_;
    MessageReassembler messageReassembler_;
    FrameDecoder frameDecoder_;
};

} // namespace axtp
