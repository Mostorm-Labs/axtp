#pragma once

#include <cstddef>
#include <queue>
#include <utility>

#include "axtp/broker/broker_flow_control.h"
#include "axtp/broker/broker_sink.h"
#include "axtp/broker/broker_task.h"
#include "axtp/broker/business_executor.h"
#include "axtp/broker/business_router.h"
#include "axtp/broker/middleware_chain.h"

namespace axtp {

class AxtpBroker {
public:
    explicit AxtpBroker(IBrokerSink& sink)
        : sink_(sink) {}

    void submit(BrokerTask task) {
        queue_.push(std::move(task));
    }

    void poll(std::size_t maxTasks = 16) {
        std::size_t processed = 0;
        while (!queue_.empty() && processed < maxTasks) {
            auto task = std::move(queue_.front());
            queue_.pop();
            ++processed;
            if (!middleware_.before(task) || !flowControl_.allow(task)) {
                continue;
            }
            if (task.type == BrokerTaskType::RpcRequest) {
                auto response = executor_.executeRpcRequest(router_, task);
                if (response.statusCode == ErrorCode::Success) {
                    sink_.onBrokerRpcResponse(std::move(response));
                } else {
                    sink_.onBrokerRpcError(std::move(response));
                }
                continue;
            }
            if (task.type == BrokerTaskType::RpcEvent) {
                sink_.onBrokerEvent(std::move(task.rpc));
            }
            if (task.type == BrokerTaskType::StreamData) {
                sink_.onBrokerStream(std::move(task.stream));
            }
        }
    }

    template <typename Handler>
    void registerMethod(std::uint32_t methodId, Handler&& handler) {
        router_.registerMethod(methodId, std::forward<Handler>(handler));
    }

    std::size_t queuedTaskCount() const {
        return queue_.size();
    }

private:
    IBrokerSink& sink_;
    std::queue<BrokerTask> queue_;
    MiddlewareChain middleware_;
    BrokerFlowControl flowControl_;
    BusinessRouter router_;
    BusinessExecutor executor_;
};

} // namespace axtp
