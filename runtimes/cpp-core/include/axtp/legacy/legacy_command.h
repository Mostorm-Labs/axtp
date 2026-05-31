#pragma once

#include <cstdint>

#include "axtp/model/bytes.h"

namespace axtp {

inline constexpr Byte kLegacyAxdpMagic0 = 0xFF;
inline constexpr Byte kLegacyAxdpMagic1 = 0xA5;
inline constexpr std::uint16_t kLegacyAxdpProtocolVersion = 0x0001;
inline constexpr std::uint16_t kLegacyAxdpHeaderSize = 14;
inline constexpr std::uint16_t kLegacyAxdpResponseOffset = 0x0080;
inline constexpr std::uint16_t kLegacyAxdpDefaultDst = 0x0002;
inline constexpr std::uint16_t kLegacyAxdpDefaultSrc = 0x0001;
inline constexpr std::uint16_t kLegacyAxdpDefaultReportSize = 64;
inline constexpr std::uint32_t kLegacyAxdpMaxPayloadSize = 4096;

enum class LegacyAxdpDeviceMask : std::uint32_t {
    Alpha = 0x000A0000,
    Beta = 0x000B0000,
    Common = 0x000C0000,
};

struct LegacyAxdpOptions {
    const char* legacyProtocol = "axdp_hid";
    LegacyAxdpDeviceMask deviceMask = LegacyAxdpDeviceMask::Beta;
    std::uint8_t reportId = 0x05;
    std::uint16_t reportSize = kLegacyAxdpDefaultReportSize;
    std::uint32_t maxPayloadSize = kLegacyAxdpMaxPayloadSize;
    bool reportFramingEnabled = true;
};

struct LegacyCommand {
    std::uint32_t cmdValue = 0;
    std::uint32_t sequence = 0;
    std::uint16_t version = kLegacyAxdpProtocolVersion;
    std::uint16_t dst = kLegacyAxdpDefaultDst;
    std::uint16_t src = kLegacyAxdpDefaultSrc;
    std::uint16_t wireCommand = 0;
    std::uint16_t crc = 0;
    std::uint8_t reportId = 0;
    bool reportFramed = false;
    Bytes payload;
};

} // namespace axtp
