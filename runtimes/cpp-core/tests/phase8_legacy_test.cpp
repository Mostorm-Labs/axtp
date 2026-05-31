#include <cassert>
#include <cstdint>
#include <fstream>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

#include "axtp/broker/axtp_broker.h"
#include "axtp/core/axtp_core.h"
#include "axtp/inbound/axtp_inbound_processor.h"
#include "axtp/io/crc16.h"
#include "axtp/io/byte_writer_sink.h"
#include "axtp/legacy/legacy_frame_decoder.h"
#include "axtp/legacy/legacy_protocol_adapter.h"
#include "axtp/mux/protocol_mux.h"
#include "axtp/outbound/axtp_outbound_processor.h"
#include "axtp/transport/mock_transport.h"

namespace {

struct CapturingByteWriter : axtp::IByteWriter {
    axtp::Bytes bytes;

    void writeBytes(const axtp::Byte* data, std::size_t size) override {
        bytes.insert(bytes.end(), data, data + size);
    }
};

struct CapturingPayloadSink : axtp::IPayloadSink {
    std::size_t controls = 0;
    std::vector<axtp::RpcPayload> rpcs;
    std::size_t streams = 0;

    void onControl(axtp::ControlPayload) override {
        ++controls;
    }
    void onRpc(axtp::RpcPayload payload) override {
        rpcs.push_back(std::move(payload));
    }
    void onStream(axtp::StreamPayload) override {
        ++streams;
    }
};

std::string readFile(const char* path) {
    std::ifstream file(path);
    std::ostringstream out;
    out << file.rdbuf();
    return out.str();
}

void writeBe16(axtp::Bytes& bytes, std::uint16_t value) {
    bytes.push_back(static_cast<axtp::Byte>((value >> 8) & 0xFF));
    bytes.push_back(static_cast<axtp::Byte>(value & 0xFF));
}

std::uint16_t readBe16(const axtp::Bytes& bytes, std::size_t offset) {
    return static_cast<std::uint16_t>((static_cast<std::uint16_t>(bytes[offset]) << 8) |
                                      static_cast<std::uint16_t>(bytes[offset + 1]));
}

axtp::Bytes makeAxdpFrame(std::uint16_t version,
                          std::uint16_t dst,
                          std::uint16_t src,
                          std::uint16_t cmd,
                          const axtp::Bytes& payload) {
    axtp::Bytes frame;
    writeBe16(frame, 0xFFA5);
    writeBe16(frame, version);
    writeBe16(frame, dst);
    writeBe16(frame, src);
    writeBe16(frame, cmd);
    writeBe16(frame, static_cast<std::uint16_t>(payload.size()));
    writeBe16(frame, 0);
    frame.insert(frame.end(), payload.begin(), payload.end());
    const auto crc = axtp::crc16Xmodem(frame);
    frame[12] = static_cast<axtp::Byte>((crc >> 8) & 0xFF);
    frame[13] = static_cast<axtp::Byte>(crc & 0xFF);
    return frame;
}

axtp::Bytes makeHidReport(const axtp::Bytes& frame, std::uint8_t reportId = 0x05) {
    axtp::Bytes report{reportId};
    report.insert(report.end(), frame.begin(), frame.end());
    return report;
}

axtp::Bytes stripSingleReport(const axtp::Bytes& bytes) {
    assert(!bytes.empty());
    assert(bytes.front() == 0x05);
    return axtp::Bytes(bytes.begin() + 1, bytes.end());
}

void assertValidAxdpCrc(const axtp::Bytes& frame) {
    auto copy = frame;
    const auto expected = readBe16(copy, 12);
    copy[12] = 0;
    copy[13] = 0;
    assert(axtp::crc16Xmodem(copy) == expected);
}

} // namespace

int main() {
    {
        axtp::LegacyFrameDecoder decoder;
        const auto rebootFromDocs = axtp::Bytes{
            0xff, 0xa5, 0x00, 0x01, 0x00, 0x02, 0x00,
            0x01, 0x00, 0x3f, 0x00, 0x00, 0xab, 0xca,
        };
        auto commands = decoder.decode(rebootFromDocs.data(), rebootFromDocs.size());
        assert(commands.size() == 1);
        assert(commands[0].version == 1);
        assert(commands[0].dst == 2);
        assert(commands[0].src == 1);
        assert(commands[0].wireCommand == 0x003f);
        assert(commands[0].payload.empty());
    }

    {
        axtp::LegacyFrameDecoder decoder;
        auto frame = makeAxdpFrame(1, 0xFFFF, 1, 0x0002, {});
        auto report = makeHidReport(frame);
        auto commands = decoder.decode(report.data(), report.size());
        assert(commands.size() == 1);
        assert(commands[0].reportId == 0x05);
        assert(commands[0].reportFramed);
        assert(commands[0].wireCommand == 0x0002);
    }

    {
        axtp::LegacyFrameDecoder decoder;
        axtp::Bytes payload(80, 0x7A);
        auto frame = makeAxdpFrame(1, 2, 1, 0x0042, payload);
        axtp::Bytes chunk1{0x05};
        chunk1.insert(chunk1.end(), frame.begin(), frame.begin() + 63);
        axtp::Bytes chunk2{0x05};
        chunk2.insert(chunk2.end(), frame.begin() + 63, frame.end());
        auto first = decoder.decode(chunk1.data(), chunk1.size());
        assert(first.empty());
        auto second = decoder.decode(chunk2.data(), chunk2.size());
        assert(second.size() == 1);
        assert(second[0].payload == payload);
    }

    {
        axtp::LegacyFrameDecoder decoder;
        auto frame = makeAxdpFrame(1, 2, 1, 0x0002, {});
        frame[13] ^= 0x01;
        assert(decoder.decode(frame.data(), frame.size()).empty());
    }

    {
        axtp::LegacyFrameDecoder decoder;
        auto oversized = makeAxdpFrame(1, 2, 1, 0x0002, {});
        oversized[10] = 0x10;
        oversized[11] = 0x01;
        assert(decoder.decode(oversized.data(), oversized.size()).empty());
    }

    axtp::AxtpCore core;
    axtp::AxtpBroker broker(core.brokerSinkPort());
    core.attachBroker(broker);

    CapturingByteWriter legacyWriter;
    axtp::LegacyProtocolAdapter legacy(core, legacyWriter);
    core.attachLegacyOutbound(legacy);

    CapturingPayloadSink axtpSink;
    axtp::AxtpInboundProcessor axtpInbound(axtpSink);
    axtp::ProtocolMux mux(axtpInbound, legacy);

    bool deviceInfoHandlerCalled = false;
    broker.registerMethod(0x0101, [&](const axtp::RpcPayload& request) {
        deviceInfoHandlerCalled = true;
        assert(request.meta.sourceProtocol == axtp::SourceProtocol::Legacy);
        assert(request.meta.legacyCommandValue == 0x000B0002);
        assert(request.meta.legacyAxdpWireCommand == 0x0002);
        assert(request.meta.legacyAxdpVersion == 1);
        assert(request.meta.legacyAxdpDst == 0xFFFF);
        assert(request.meta.legacyAxdpSrc == 1);
        assert(request.meta.legacyAxdpReportFramed);
        assert(request.methodOrEventId == 0x0101);
        assert(request.body.empty());
        return axtp::Bytes{0x55};
    });

    const auto deviceInfoRequest = makeHidReport(makeAxdpFrame(1, 0xFFFF, 1, 0x0002, {}));
    mux.onBytes(deviceInfoRequest.data(), deviceInfoRequest.size());
    assert(deviceInfoHandlerCalled == false);
    broker.poll();
    assert(deviceInfoHandlerCalled);

    assert(!legacyWriter.bytes.empty());
    auto responseFrame = stripSingleReport(legacyWriter.bytes);
    assert(readBe16(responseFrame, 0) == 0xFFA5);
    assert(readBe16(responseFrame, 2) == 1);
    assert(readBe16(responseFrame, 4) == 1);
    assert(readBe16(responseFrame, 6) == 0xFFFF);
    assert(readBe16(responseFrame, 8) == 0x0082);
    assert(readBe16(responseFrame, 10) == 1);
    assert(responseFrame[14] == 0x55);
    assertValidAxdpCrc(responseFrame);

    bool brightnessHandlerCalled = false;
    broker.registerMethod(0x0502, [&](const axtp::RpcPayload& request) {
        brightnessHandlerCalled = true;
        assert(request.meta.legacyCommandValue == 0x000B0042);
        assert(request.meta.legacyAxdpWireCommand == 0x0042);
        assert((request.body == axtp::Bytes{0x32}));
        return axtp::Bytes{};
    });
    const auto brightnessRequest = makeHidReport(makeAxdpFrame(1, 2, 1, 0x0042, {0x32}));
    mux.onBytes(brightnessRequest.data(), brightnessRequest.size());
    broker.poll();
    assert(brightnessHandlerCalled);

    CapturingByteWriter standardWriter;
    axtp::AxtpOutboundProcessor standardOutbound(standardWriter);
    axtp::RpcPayload standardRequest;
    standardRequest.encoding = axtp::RpcEncoding::Binary;
    standardRequest.op = axtp::RpcOp::Request;
    standardRequest.requestId = 9;
    standardRequest.methodOrEventId = 0x0101;
    standardRequest.statusCode = axtp::ErrorCode::Success;
    standardRequest.bodyEncoding = axtp::RpcBodyEncoding::RawBytes;
    standardOutbound.sendRpcRequest(standardRequest);
    mux.onBytes(standardWriter.bytes.data(), standardWriter.bytes.size());
    assert(axtpSink.rpcs.size() == 1);
    assert(axtpSink.rpcs[0].requestId == 9);

    {
        axtp::AxtpCore routedCore;
        axtp::AxtpBroker routedBroker(routedCore.brokerSinkPort());
        routedCore.attachBroker(routedBroker);
        axtp::MockTransport transport;
        CapturingByteWriter routedLegacyWriter;
        axtp::LegacyProtocolAdapter routedLegacy(routedCore, routedLegacyWriter);
        routedCore.attachLegacy(routedLegacy, routedLegacy);
        routedCore.attachTransport(transport);

        bool routedHandlerCalled = false;
        routedBroker.registerMethod(0x0101, [&](const axtp::RpcPayload& request) {
            routedHandlerCalled = true;
            assert(request.meta.sourceProtocol == axtp::SourceProtocol::Legacy);
            assert(request.meta.legacyCommandValue == 0x000B0002);
            return axtp::Bytes{0x66};
        });

        const auto routedRequest = makeHidReport(makeAxdpFrame(1, 0xFFFF, 1, 0x0002, {}));
        transport.injectIncoming(routedRequest);
        routedBroker.poll();
        assert(routedHandlerCalled);
        assert(!routedLegacyWriter.bytes.empty());
    }

    const auto coreText = readFile("runtimes/cpp-core/include/axtp/core/axtp_core.h");
    const auto brokerText = readFile("runtimes/cpp-core/include/axtp/broker/axtp_broker.h");
    assert(coreText.find("0x000B0002") == std::string::npos);
    assert(brokerText.find("0x000B0002") == std::string::npos);

    return 0;
}
