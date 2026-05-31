#pragma once

#include <cstddef>

#include "axtp/inbound/axtp_inbound_processor.h"
#include "axtp/io/byte_sink.h"
#include "axtp/legacy/legacy_protocol_adapter.h"
#include "axtp/model/protocol_types.h"

namespace axtp {

class ProtocolMux : public IByteSink {
public:
    ProtocolMux(AxtpInboundProcessor& axtp, LegacyProtocolAdapter& legacy)
        : axtp_(axtp), legacy_(legacy) {}

    void onBytes(const Byte* data, std::size_t size) override {
        if (size >= 2 && data[0] == kAxtpStandardMagic0 && data[1] == kAxtpStandardMagic1) {
            axtp_.onBytes(data, size);
            return;
        }
        legacy_.onBytes(data, size);
    }

private:
    AxtpInboundProcessor& axtp_;
    LegacyProtocolAdapter& legacy_;
};

} // namespace axtp
