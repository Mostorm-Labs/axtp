#pragma once

#include <cstdint>

#include "axtp/model/bytes.h"

namespace axtp {

struct LegacyCommand {
    std::uint32_t cmdValue = 0;
    std::uint32_t sequence = 0;
    Bytes payload;
};

} // namespace axtp
