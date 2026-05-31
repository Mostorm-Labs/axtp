#pragma once

#include <utility>

#include "axtp/model/payload.h"
#include "axtp/model/protocol_types.h"
#include "axtp/transport/transport_profile.h"

namespace axtp {

struct SessionContext {
    std::uint32_t sessionId = 0;
    ProtocolMode protocolMode = ProtocolMode::AxtpV1;
    TransportProfile transportProfile;
    RpcEncoding selectedEncoding = RpcEncoding::Binary;
};

class IProtocolOutbound {
public:
    virtual ~IProtocolOutbound() = default;
    virtual void sendRpc(RpcPayload payload) = 0;
};

} // namespace axtp
