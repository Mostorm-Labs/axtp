#pragma once

#include <functional>
#include <map>
#include <utility>

#include "axtp/model/payload.h"

namespace axtp {

class BusinessRouter {
public:
    using Handler = std::function<Bytes(const RpcPayload&)>;

    void registerMethod(std::uint32_t methodId, Handler handler) {
        handlers_[methodId] = std::move(handler);
    }

    RpcPayload handleRpcRequest(const RpcPayload& request) const {
        RpcPayload response;
        response.encoding = request.encoding;
        response.op = RpcOp::RequestResponse;
        response.requestId = request.requestId;
        response.methodOrEventId = request.methodOrEventId;
        response.statusCode = ErrorCode::Success;
        response.bodyEncoding = request.bodyEncoding;
        response.meta = request.meta;

        auto it = handlers_.find(request.methodOrEventId);
        if (it == handlers_.end()) {
            response.statusCode = ErrorCode::RpcMethodNotFound;
            return response;
        }

        response.body = it->second(request);
        return response;
    }

private:
    std::map<std::uint32_t, Handler> handlers_;
};

} // namespace axtp
