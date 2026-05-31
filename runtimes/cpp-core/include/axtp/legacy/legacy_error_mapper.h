#pragma once

#include <cstddef>
#include <cstdint>

#include "axtp/generated/axtp_legacy_mapping_generated.h"
#include "axtp/model/payload.h"

namespace axtp {

class LegacyErrorMapper {
public:
    static std::uint16_t toLegacyStatus(ErrorCode code, std::uint32_t legacyCmdValue = 0) {
        if (legacyCmdValue != 0) {
            for (std::size_t i = 0; i < kLegacyMappingCount; ++i) {
                if (kLegacyMappings[i].legacy_cmd_value != legacyCmdValue) {
                    continue;
                }
                for (std::size_t j = 0; j < kLegacyMappings[i].status_mapping_count; ++j) {
                    if (kLegacyMappings[i].status_mappings[j].axtp_error == code) {
                        return kLegacyMappings[i].status_mappings[j].legacy_status;
                    }
                }
            }
        }
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
