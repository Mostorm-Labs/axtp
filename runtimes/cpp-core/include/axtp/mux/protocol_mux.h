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
        if (looksLikeAxtpV1(data, size)) {
            axtp_.onBytes(data, size);
            return;
        }
        legacy_.onBytes(data, size);
    }

private:
    bool looksLikeAxtpV1(const Byte* data, std::size_t size) const {
        if (data == nullptr || size == 0) {
            return true;
        }
        if (data[0] != kAxtpStandardMagic0) {
            return false;
        }
        return size == 1 || data[1] == kAxtpStandardMagic1;
    }

    AxtpInboundProcessor& axtp_;
    LegacyProtocolAdapter& legacy_;
};

} // namespace axtp
