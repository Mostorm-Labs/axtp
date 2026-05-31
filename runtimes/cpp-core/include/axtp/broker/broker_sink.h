#pragma once

#include "axtp/model/payload.h"

namespace axtp {

class IBrokerSink {
public:
    virtual ~IBrokerSink() = default;
    virtual void onBrokerRpcResponse(RpcPayload payload) = 0;
    virtual void onBrokerRpcError(RpcPayload payload) = 0;
    virtual void onBrokerEvent(RpcPayload payload) = 0;
    virtual void onBrokerStream(StreamPayload payload) = 0;
};

} // namespace axtp
