#pragma once

#include <utility>

#include "axtp/core/axtp_core.h"
#include "axtp/core/session_context.h"
#include "axtp/io/byte_sink.h"
#include "axtp/io/byte_writer_sink.h"
#include "axtp/legacy/legacy_frame_decoder.h"
#include "axtp/legacy/legacy_frame_encoder.h"
#include "axtp/legacy/legacy_method_mapper.h"

namespace axtp {

class LegacyProtocolAdapter : public IByteSink, public IProtocolOutbound {
public:
    LegacyProtocolAdapter(AxtpCore& core, IByteWriter& writer, LegacyAxdpOptions options = {})
        : core_(core), writer_(writer), options_(options), decoder_(options), encoder_(options) {}

    void onBytes(const Byte* data, std::size_t size) override {
        auto commands = decoder_.decode(data, size);
        for (auto& command : commands) {
            auto canonical = LegacyMethodMapper::toCanonicalCommand(command.wireCommand, options_);
            if (!canonical.has_value()) {
                continue;
            }
            command.cmdValue = *canonical;

            auto methodId = LegacyMethodMapper::toMethodId(command.cmdValue, options_.legacyProtocol);
            if (!methodId.has_value()) {
                continue;
            }

            RpcPayload payload;
            payload.encoding = RpcEncoding::Binary;
            payload.op = RpcOp::Request;
            payload.requestId = command.cmdValue;
            payload.methodOrEventId = *methodId;
            payload.statusCode = ErrorCode::Success;
            payload.bodyEncoding = RpcBodyEncoding::RawBytes;
            payload.meta.sourceProtocol = SourceProtocol::Legacy;
            payload.meta.requestId = payload.requestId;
            payload.meta.legacySequence = command.sequence;
            payload.meta.legacyCommandValue = command.cmdValue;
            payload.meta.legacyAxdpVersion = command.version;
            payload.meta.legacyAxdpDst = command.dst;
            payload.meta.legacyAxdpSrc = command.src;
            payload.meta.legacyAxdpWireCommand = command.wireCommand;
            payload.meta.legacyAxdpReportId = command.reportId;
            payload.meta.legacyAxdpReportFramed = command.reportFramed;
            payload.body = std::move(command.payload);
            core_.payloadSinkPort().onRpc(std::move(payload));
        }
    }

    void sendRpc(RpcPayload payload) override {
        if (payload.meta.legacyCommandValue == 0) {
            auto cmd = LegacyMethodMapper::toLegacyCommand(payload.methodOrEventId, options_.legacyProtocol);
            if (cmd.has_value()) {
                payload.meta.legacyCommandValue = *cmd;
            }
        }
        auto bytes = encoder_.encodeResponse(payload);
        writer_.writeBytes(bytes.data(), bytes.size());
    }

private:
    AxtpCore& core_;
    IByteWriter& writer_;
    LegacyAxdpOptions options_;
    LegacyFrameDecoder decoder_;
    LegacyFrameEncoder encoder_;
};

} // namespace axtp
