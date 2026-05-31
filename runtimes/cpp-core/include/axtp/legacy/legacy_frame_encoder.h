#pragma once

#include <algorithm>
#include <cstddef>

#include "axtp/io/crc16.h"
#include "axtp/legacy/legacy_command.h"
#include "axtp/legacy/legacy_error_mapper.h"
#include "axtp/model/payload.h"

namespace axtp {

class LegacyFrameEncoder {
public:
    explicit LegacyFrameEncoder(LegacyAxdpOptions options = {})
        : options_(options) {}

    Bytes encodeResponse(const RpcPayload& payload) const {
        const auto body = encodeResponsePayload(payload);
        Bytes frame;
        frame.reserve(kLegacyAxdpHeaderSize + body.size());
        writeBe16(frame, 0xFFA5);
        writeBe16(frame, payload.meta.legacyAxdpVersion == 0 ? kLegacyAxdpProtocolVersion
                                                             : payload.meta.legacyAxdpVersion);
        writeBe16(frame, payload.meta.legacyAxdpSrc == 0 ? kLegacyAxdpDefaultSrc
                                                         : payload.meta.legacyAxdpSrc);
        writeBe16(frame, payload.meta.legacyAxdpDst == 0 ? kLegacyAxdpDefaultDst
                                                         : payload.meta.legacyAxdpDst);
        const auto requestCommand = payload.meta.legacyAxdpWireCommand == 0
                                        ? static_cast<std::uint16_t>(payload.meta.legacyCommandValue & 0xFFFF)
                                        : payload.meta.legacyAxdpWireCommand;
        writeBe16(frame, static_cast<std::uint16_t>(requestCommand + kLegacyAxdpResponseOffset));
        writeBe16(frame, static_cast<std::uint16_t>(body.size()));
        writeBe16(frame, 0);
        frame.insert(frame.end(), body.begin(), body.end());

        const auto crc = crc16Xmodem(frame);
        frame[kCrcOffset] = static_cast<Byte>((crc >> 8) & 0xFF);
        frame[kCrcOffset + 1] = static_cast<Byte>(crc & 0xFF);

        if (!options_.reportFramingEnabled) {
            return frame;
        }
        return addHidReports(frame, payload.meta.legacyAxdpReportFramed ? payload.meta.legacyAxdpReportId
                                                                        : options_.reportId);
    }

private:
    static constexpr std::size_t kCrcOffset = 12;

    Bytes encodeResponsePayload(const RpcPayload& payload) const {
        if (payload.statusCode == ErrorCode::Success || !payload.body.empty()) {
            return payload.body;
        }

        const auto status = LegacyErrorMapper::toLegacyStatus(payload.statusCode, payload.meta.legacyCommandValue);
        return Bytes{
            static_cast<Byte>((status >> 24) & 0xFF),
            static_cast<Byte>((status >> 16) & 0xFF),
            static_cast<Byte>((status >> 8) & 0xFF),
            static_cast<Byte>(status & 0xFF),
        };
    }

    Bytes addHidReports(const Bytes& frame, std::uint8_t reportId) const {
        if (options_.reportSize <= 1) {
            return frame;
        }

        const auto chunkSize = static_cast<std::size_t>(options_.reportSize - 1);
        Bytes out;
        for (std::size_t offset = 0; offset < frame.size(); offset += chunkSize) {
            const auto n = std::min(chunkSize, frame.size() - offset);
            out.push_back(reportId);
            out.insert(out.end(), frame.begin() + static_cast<std::ptrdiff_t>(offset),
                       frame.begin() + static_cast<std::ptrdiff_t>(offset + n));
        }
        return out;
    }

    static void writeBe16(Bytes& bytes, std::uint16_t value) {
        bytes.push_back(static_cast<Byte>((value >> 8) & 0xFF));
        bytes.push_back(static_cast<Byte>(value & 0xFF));
    }

    LegacyAxdpOptions options_;
};

} // namespace axtp
