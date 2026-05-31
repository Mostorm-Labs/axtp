#pragma once

#include <optional>
#include <utility>

#include "axtp/model/payload.h"

namespace axtp {

class StreamSession {
public:
    void handle(StreamPayload payload) {
        lastStream_ = std::move(payload);
    }

    const std::optional<StreamPayload>& lastStream() const {
        return lastStream_;
    }

private:
    std::optional<StreamPayload> lastStream_;
};

} // namespace axtp
