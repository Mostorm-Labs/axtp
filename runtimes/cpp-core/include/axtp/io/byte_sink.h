#pragma once

#include <cstddef>

#include "axtp/model/bytes.h"

namespace axtp {

class IByteSink {
public:
    virtual ~IByteSink() = default;
    virtual void onBytes(const Byte* data, std::size_t size) = 0;
};

} // namespace axtp
