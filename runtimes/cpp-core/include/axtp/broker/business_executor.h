#pragma once

#include <utility>

#include "axtp/broker/broker_task.h"
#include "axtp/broker/business_router.h"

namespace axtp {

class BusinessExecutor {
public:
    RpcPayload executeRpcRequest(const BusinessRouter& router, const BrokerTask& task) const {
        return router.handleRpcRequest(task.rpc);
    }
};

} // namespace axtp
