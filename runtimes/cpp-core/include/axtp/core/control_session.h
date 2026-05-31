#pragma once

#include <optional>
#include <utility>

#include "axtp/model/payload.h"

namespace axtp {

class ControlSession {
public:
    std::optional<ControlPayload> handle(ControlPayload payload) {
        lastOpcode_ = payload.opcode;
        if (payload.opcode == ControlOpcode::Open) {
            open_ = true;
            return makeResponse(ControlOpcode::Accept, payload);
        }
        if (payload.opcode == ControlOpcode::Ping) {
            return makeResponse(ControlOpcode::Pong, payload);
        }
        if (payload.opcode == ControlOpcode::Close) {
            open_ = false;
            return makeResponse(ControlOpcode::CloseAck, payload);
        }
        return std::nullopt;
    }

    bool isOpen() const {
        return open_;
    }

    ControlOpcode lastOpcode() const {
        return lastOpcode_;
    }

private:
    static ControlPayload makeResponse(ControlOpcode opcode, const ControlPayload& request) {
        ControlPayload response;
        response.opcode = opcode;
        response.controlId = request.controlId;
        response.statusCode = ErrorCode::Success;
        response.meta = request.meta;
        return response;
    }

    bool open_ = false;
    ControlOpcode lastOpcode_ = ControlOpcode::Open;
};

} // namespace axtp
