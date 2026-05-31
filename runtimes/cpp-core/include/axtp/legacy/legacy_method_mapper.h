#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>

#include "axtp/generated/axtp_legacy_mapping_generated.h"
#include "axtp/legacy/legacy_command.h"

namespace axtp {

class LegacyMethodMapper {
public:
    static std::optional<std::uint16_t> toMethodId(std::uint32_t legacyCmdValue,
                                                   const char* legacyProtocol = "axdp_hid") {
        for (std::size_t i = 0; i < kLegacyMappingCount; ++i) {
            if (sameProtocol(kLegacyMappings[i].legacy_protocol, legacyProtocol) &&
                kLegacyMappings[i].legacy_cmd_value == legacyCmdValue) {
                return kLegacyMappings[i].axtp_method_id;
            }
        }
        return std::nullopt;
    }

    static std::optional<std::uint32_t> toLegacyCommand(std::uint16_t methodId,
                                                        const char* legacyProtocol = "axdp_hid") {
        for (std::size_t i = 0; i < kLegacyMappingCount; ++i) {
            if (sameProtocol(kLegacyMappings[i].legacy_protocol, legacyProtocol) &&
                kLegacyMappings[i].axtp_method_id == methodId) {
                return kLegacyMappings[i].legacy_cmd_value;
            }
        }
        return std::nullopt;
    }

    static std::optional<std::uint32_t> toCanonicalCommand(std::uint16_t wireCommand,
                                                           const LegacyAxdpOptions& options) {
        const auto masked = static_cast<std::uint32_t>(options.deviceMask) | wireCommand;
        if (hasMapping(masked, options.legacyProtocol)) {
            return masked;
        }

        const auto common = static_cast<std::uint32_t>(LegacyAxdpDeviceMask::Common) | wireCommand;
        if (hasMapping(common, options.legacyProtocol)) {
            return common;
        }

        if (hasMapping(wireCommand, options.legacyProtocol)) {
            return wireCommand;
        }

        std::optional<std::uint32_t> unique;
        for (std::size_t i = 0; i < kLegacyMappingCount; ++i) {
            if (!sameProtocol(kLegacyMappings[i].legacy_protocol, options.legacyProtocol)) {
                continue;
            }
            if ((kLegacyMappings[i].legacy_cmd_value & 0xFFFF) != wireCommand) {
                continue;
            }
            if (unique.has_value()) {
                return std::nullopt;
            }
            unique = kLegacyMappings[i].legacy_cmd_value;
        }
        return unique;
    }

private:
    static bool hasMapping(std::uint32_t legacyCmdValue, const char* legacyProtocol) {
        return toMethodId(legacyCmdValue, legacyProtocol).has_value();
    }

    static bool sameProtocol(const char* lhs, const char* rhs) {
        if (lhs == nullptr || rhs == nullptr) {
            return lhs == rhs;
        }
        while (*lhs != '\0' && *rhs != '\0') {
            if (*lhs != *rhs) {
                return false;
            }
            ++lhs;
            ++rhs;
        }
        return *lhs == *rhs;
    }
};

} // namespace axtp
