#pragma once

#include <map>
#include <optional>
#include <utility>

#include "axtp/model/payload.h"

namespace axtp {

class PendingCallTable {
public:
    void expect(std::uint32_t requestId) {
        pending_[requestId] = {};
    }

    void resolve(std::uint32_t requestId, RpcPayload payload) {
        resolved_[requestId] = std::move(payload);
        pending_.erase(requestId);
    }

    bool isPending(std::uint32_t requestId) const {
        return pending_.find(requestId) != pending_.end();
    }

    std::optional<RpcPayload> tryTakeResolved(std::uint32_t requestId) {
        auto it = resolved_.find(requestId);
        if (it == resolved_.end()) {
            return std::nullopt;
        }
        auto payload = std::move(it->second);
        resolved_.erase(it);
        return payload;
    }

private:
    std::map<std::uint32_t, RpcPayload> pending_;
    std::map<std::uint32_t, RpcPayload> resolved_;
};

} // namespace axtp
