#pragma once

#include <cstddef>
#include <cstdint>
#include <utility>

#include "axtp/io/byte_buffer.h"
#include "axtp/io/byte_reader.h"
#include "axtp/io/crc16.h"
#include "axtp/model/frame.h"

namespace axtp {

class IFrameSink {
public:
    virtual ~IFrameSink() = default;
    virtual void onFrame(Frame frame) = 0;
};

class FrameDecoder {
public:
    explicit FrameDecoder(IFrameSink& next)
        : next_(next) {}

    void onBytes(const Byte* data, std::size_t size) {
        buffer_.append(data, size);
        parseLoop();
    }

private:
    static bool isPayloadType(Byte value) {
        return value == static_cast<Byte>(PayloadType::Control) ||
               value == static_cast<Byte>(PayloadType::Rpc) ||
               value == static_cast<Byte>(PayloadType::Stream);
    }

    void resyncToMagic() {
        const auto& bytes = buffer_.bytes();
        for (std::size_t i = 0; i + 1 < bytes.size(); ++i) {
            if (bytes[i] == kAxtpStandardMagic0 && bytes[i + 1] == kAxtpStandardMagic1) {
                if (i > 0) {
                    (void)buffer_.consume(i);
                }
                return;
            }
        }
        if (bytes.empty()) {
            return;
        }
        const bool keepTrailingMagic0 = bytes.back() == kAxtpStandardMagic0;
        const std::size_t keep = keepTrailingMagic0 ? 1 : 0;
        (void)buffer_.consume(bytes.size() - keep);
    }

    void parseLoop() {
        while (true) {
            resyncToMagic();
            if (buffer_.size() < kStandardFrameHeaderSize + kStandardFrameCrcSize) {
                return;
            }

            auto headerBytes = buffer_.peek(kStandardFrameHeaderSize);
            if (!headerBytes.ok()) {
                return;
            }

            ByteReader reader(headerBytes.value);
            (void)reader.readU8();
            (void)reader.readU8();
            const auto version = reader.readU8();
            const auto payloadType = reader.readU8();
            const auto payloadLength = reader.readU16();
            const auto sourceId = reader.readU8();
            const auto destinationId = reader.readU8();
            const auto messageId = reader.readU16();
            const auto frameIndex = reader.readU8();
            const auto frameCount = reader.readU8();

            if (!version.ok() || !payloadType.ok() || !payloadLength.ok() ||
                !sourceId.ok() || !destinationId.ok() || !messageId.ok() ||
                !frameIndex.ok() || !frameCount.ok()) {
                return;
            }

            if (version.value != kAxtpVersion1 || !isPayloadType(payloadType.value) ||
                frameCount.value == 0 || frameIndex.value >= frameCount.value) {
                (void)buffer_.consume(1);
                continue;
            }

            const std::size_t totalSize = kStandardFrameHeaderSize +
                                          static_cast<std::size_t>(payloadLength.value) +
                                          kStandardFrameCrcSize;
            if (buffer_.size() < totalSize) {
                return;
            }

            auto frameBytes = buffer_.peek(totalSize);
            if (!frameBytes.ok()) {
                return;
            }
            ByteReader footerReader(frameBytes.value.data() + totalSize - kStandardFrameCrcSize,
                                    kStandardFrameCrcSize);
            const auto expectedCrc = footerReader.readU16();
            const auto actualCrc = crc16CcittFalse(frameBytes.value.data(),
                                                   totalSize - kStandardFrameCrcSize);
            if (!expectedCrc.ok() || expectedCrc.value != actualCrc) {
                (void)buffer_.consume(1);
                continue;
            }

            Frame frame;
            frame.header.version = version.value;
            frame.header.payloadType = static_cast<PayloadType>(payloadType.value);
            frame.header.payloadLength = payloadLength.value;
            frame.header.sourceId = sourceId.value;
            frame.header.destinationId = destinationId.value;
            frame.header.messageId = messageId.value;
            frame.header.frameIndex = frameIndex.value;
            frame.header.frameCount = frameCount.value;
            frame.payload.assign(frameBytes.value.begin() + kStandardFrameHeaderSize,
                                 frameBytes.value.begin() + kStandardFrameHeaderSize +
                                     static_cast<std::ptrdiff_t>(payloadLength.value));
            frame.crc16 = expectedCrc.value;
            (void)buffer_.consume(totalSize);
            next_.onFrame(std::move(frame));
        }
    }

    IFrameSink& next_;
    ByteBuffer buffer_;
};

} // namespace axtp
