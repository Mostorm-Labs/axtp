#pragma once

#include "axtp/io/byte_writer.h"
#include "axtp/legacy/legacy_command.h"
#include "axtp/legacy/legacy_error_mapper.h"
#include "axtp/model/payload.h"

namespace axtp {

class LegacyFrameEncoder {
public:
    Bytes encodeResponse(const RpcPayload& payload) const {
        ByteWriter writer;
        writer.writeU32(payload.meta.legacyCommandValue);
        writer.writeU32(payload.meta.legacySequence);
        writer.writeU16(LegacyErrorMapper::toLegacyStatus(payload.statusCode));
        writer.writeBytes(payload.body);
        return writer.takeBytes();
    }
};

} // namespace axtp
