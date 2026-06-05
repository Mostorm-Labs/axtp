# AXTP Flutter Runtime

This package mirrors the C++ runtime layering in Dart:

```text
AxtpTransport <-> AxtpEndpoint -> AxtpCore -> BasicBroker
```

The package is pure Dart so it can be used directly by Flutter apps and tested
without a platform plugin. HID, BLE, USB, and socket connectors should live in
optional Flutter/plugin packages and implement `AxtpTransport`.

P0 supports:

- FramedBinary payload encode/decode with frame fragmentation and CRC16.
- WebSocketJsonRpc complete-text-message encode/decode.
- `AxtpCore`, `BasicBroker`, `AxtpEndpoint`, `MockTransport`.
- Dynamic JSON, TLV, and raw RPC calls through `AxtpClient`.
- Generated registry lookup from the AXTP generator.
