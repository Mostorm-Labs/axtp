#pragma once

#include <cstdint>

#include "axtp/model/payload.h"

namespace axtp {

class LegacyErrorMapper {
public:
    static std::uint16_t toLegacyStatus(ErrorCode code) {
        if (code == ErrorCode::Success) {
            return 0x00;
        }
        if (code == ErrorCode::RpcParamInvalid) {
            return 0x01;
        }
        if (code == ErrorCode::Busy) {
            return 0x02;
        }
        return 0xFFFF;
    }
};

} // namespace axtp
