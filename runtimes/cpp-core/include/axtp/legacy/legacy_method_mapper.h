#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>

#include "axtp/generated/axtp_legacy_mapping_generated.h"

namespace axtp {

class LegacyMethodMapper {
public:
    static std::optional<std::uint16_t> toMethodId(std::uint32_t legacyCmdValue) {
        for (std::size_t i = 0; i < kLegacyMappingCount; ++i) {
            if (kLegacyMappings[i].legacy_cmd_value == legacyCmdValue) {
                return kLegacyMappings[i].axtp_method_id;
            }
        }
        return std::nullopt;
    }

    static std::optional<std::uint32_t> toLegacyCommand(std::uint16_t methodId) {
        for (std::size_t i = 0; i < kLegacyMappingCount; ++i) {
            if (kLegacyMappings[i].axtp_method_id == methodId) {
                return kLegacyMappings[i].legacy_cmd_value;
            }
        }
        return std::nullopt;
    }
};

} // namespace axtp
