#pragma once

#include <algorithm>
#include <cstddef>
#include <utility>
#include <vector>

#include "axtp/io/crc16.h"
#include "axtp/legacy/legacy_command.h"

namespace axtp {

class LegacyFrameDecoder {
public:
    explicit LegacyFrameDecoder(LegacyAxdpOptions options = {})
        : options_(options) {}

    std::vector<LegacyCommand> decode(const Byte* data, std::size_t size) {
        appendInput(data, size);

        std::vector<LegacyCommand> commands;
        while (true) {
            if (!alignToMagic()) {
                return commands;
            }
            if (buffer_.size() < kLegacyAxdpHeaderSize) {
                return commands;
            }

            const auto payloadLength = readBe16(kPayloadLengthOffset);
            if (payloadLength > options_.maxPayloadSize) {
                buffer_.erase(buffer_.begin());
                continue;
            }

            const auto totalLength = static_cast<std::size_t>(kLegacyAxdpHeaderSize) + payloadLength;
            if (buffer_.size() < totalLength) {
                return commands;
            }

            Bytes frame(buffer_.begin(), buffer_.begin() + static_cast<std::ptrdiff_t>(totalLength));
            const auto expectedCrc = readBe16From(frame, kCrcOffset);
            frame[kCrcOffset] = 0;
            frame[kCrcOffset + 1] = 0;
            const auto actualCrc = crc16Xmodem(frame);
            if (actualCrc != expectedCrc) {
                buffer_.erase(buffer_.begin());
                continue;
            }

            LegacyCommand command;
            command.sequence = 0;
            command.version = readBe16(kVersionOffset);
            command.dst = readBe16(kDestinationOffset);
            command.src = readBe16(kSourceOffset);
            command.wireCommand = readBe16(kCommandOffset);
            command.cmdValue = command.wireCommand;
            command.crc = expectedCrc;
            command.reportId = activeReportId_;
            command.reportFramed = activeReportFramed_;
            command.payload.assign(buffer_.begin() + kPayloadOffset,
                                   buffer_.begin() + static_cast<std::ptrdiff_t>(totalLength));
            commands.push_back(std::move(command));
            buffer_.erase(buffer_.begin(), buffer_.begin() + static_cast<std::ptrdiff_t>(totalLength));
        }
    }

    void reset() {
        buffer_.clear();
        activeReportId_ = 0;
        activeReportFramed_ = false;
    }

private:
    static constexpr std::size_t kVersionOffset = 2;
    static constexpr std::size_t kDestinationOffset = 4;
    static constexpr std::size_t kSourceOffset = 6;
    static constexpr std::size_t kCommandOffset = 8;
    static constexpr std::size_t kPayloadLengthOffset = 10;
    static constexpr std::size_t kCrcOffset = 12;
    static constexpr std::size_t kPayloadOffset = 14;

    void appendInput(const Byte* data, std::size_t size) {
        if (data == nullptr || size == 0) {
            return;
        }
        if (options_.reportFramingEnabled && size > 1 &&
            (data[0] == options_.reportId || data[0] == 0x00)) {
            activeReportId_ = data[0];
            activeReportFramed_ = true;
            buffer_.insert(buffer_.end(), data + 1, data + size);
            return;
        }
        activeReportId_ = 0;
        activeReportFramed_ = false;
        buffer_.insert(buffer_.end(), data, data + size);
    }

    bool alignToMagic() {
        const auto it = std::search(buffer_.begin(), buffer_.end(), kMagic.begin(), kMagic.end());
        if (it == buffer_.end()) {
            const bool keepPossiblePrefix = !buffer_.empty() && buffer_.back() == kLegacyAxdpMagic0;
            buffer_.clear();
            if (keepPossiblePrefix) {
                buffer_.push_back(kLegacyAxdpMagic0);
            }
            return false;
        }
        if (it != buffer_.begin()) {
            buffer_.erase(buffer_.begin(), it);
        }
        return true;
    }

    std::uint16_t readBe16(std::size_t offset) const {
        return readBe16From(buffer_, offset);
    }

    static std::uint16_t readBe16From(const Bytes& bytes, std::size_t offset) {
        return static_cast<std::uint16_t>((static_cast<std::uint16_t>(bytes[offset]) << 8) |
                                          static_cast<std::uint16_t>(bytes[offset + 1]));
    }

    LegacyAxdpOptions options_;
    Bytes buffer_;
    std::uint8_t activeReportId_ = 0;
    bool activeReportFramed_ = false;
    const Bytes kMagic{kLegacyAxdpMagic0, kLegacyAxdpMagic1};
};

} // namespace axtp
