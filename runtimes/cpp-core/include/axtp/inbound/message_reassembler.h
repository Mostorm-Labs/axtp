#pragma once

#include <cstddef>
#include <map>
#include <optional>
#include <utility>
#include <vector>

#include "axtp/inbound/frame_decoder.h"
#include "axtp/model/message.h"

namespace axtp {

class IMessageSink {
public:
    virtual ~IMessageSink() = default;
    virtual void onMessage(Message message) = 0;
};

class MessageReassembler : public IFrameSink {
public:
    explicit MessageReassembler(IMessageSink& next, std::size_t maxMessageSize = 1024 * 1024)
        : next_(next), maxMessageSize_(maxMessageSize) {}

    void onFrame(Frame frame) override {
        if (frame.header.frameCount == 1) {
            if (frame.header.frameIndex != 0) {
                return;
            }
            next_.onMessage(Message{frame.header.messageId, frame.header.payloadType, std::move(frame.payload)});
            return;
        }

        auto& assembly = assemblies_[frame.header.messageId];
        if (assembly.fragments.empty()) {
            assembly.payloadType = frame.header.payloadType;
            assembly.frameCount = frame.header.frameCount;
            assembly.fragments.resize(frame.header.frameCount);
        }

        if (assembly.payloadType != frame.header.payloadType ||
            assembly.frameCount != frame.header.frameCount ||
            frame.header.frameIndex >= assembly.fragments.size()) {
            assemblies_.erase(frame.header.messageId);
            return;
        }

        auto& slot = assembly.fragments[frame.header.frameIndex];
        if (slot.has_value()) {
            return;
        }
        assembly.totalSize += frame.payload.size();
        if (assembly.totalSize > maxMessageSize_) {
            assemblies_.erase(frame.header.messageId);
            return;
        }
        slot = std::move(frame.payload);

        for (const auto& fragment : assembly.fragments) {
            if (!fragment.has_value()) {
                return;
            }
        }

        Message message;
        message.messageId = frame.header.messageId;
        message.payloadType = assembly.payloadType;
        message.body.reserve(assembly.totalSize);
        for (auto& fragment : assembly.fragments) {
            message.body.insert(message.body.end(), fragment->begin(), fragment->end());
        }
        assemblies_.erase(message.messageId);
        next_.onMessage(std::move(message));
    }

private:
    struct Assembly {
        PayloadType payloadType = PayloadType::Rpc;
        std::uint8_t frameCount = 0;
        std::size_t totalSize = 0;
        std::vector<std::optional<Bytes>> fragments;
    };

    IMessageSink& next_;
    std::size_t maxMessageSize_;
    std::map<std::uint16_t, Assembly> assemblies_;
};

} // namespace axtp
