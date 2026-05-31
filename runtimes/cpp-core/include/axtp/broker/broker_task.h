#pragma once

#include "axtp/broker/broker_context.h"
#include "axtp/model/payload.h"

namespace axtp {

struct BrokerTask {
    BrokerTaskType type = BrokerTaskType::RpcRequest;
    BrokerPriority priority = BrokerPriority::Normal;
    BrokerContext context;
    RpcPayload rpc;
    StreamPayload stream;
    ControlPayload control;
};

} // namespace axtp
