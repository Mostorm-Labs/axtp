#pragma once

#include <optional>
#include <utility>

#include "axtp/io/byte_reader.h"
#include "axtp/legacy/legacy_command.h"

namespace axtp {

class LegacyFrameDecoder {
public:
    std::optional<LegacyCommand> decode(const Byte* data, std::size_t size) const {
        if (size < 8) {
            return std::nullopt;
        }
        ByteReader reader(data, size);
        auto cmd = reader.readU32();
        auto sequence = reader.readU32();
        auto payload = reader.readBytes(reader.remaining());
        if (!cmd.ok() || !sequence.ok() || !payload.ok()) {
            return std::nullopt;
        }
        return LegacyCommand{cmd.value, sequence.value, std::move(payload.value)};
    }
};

} // namespace axtp
