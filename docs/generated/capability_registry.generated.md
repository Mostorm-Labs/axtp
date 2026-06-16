# Capability Registry

| capabilityId | name | domain | status | type | schema |
|---:|---|---|---|---|---|
| `0x0001` | `protocol.payload.control` | protocol | mvp | bool | - |
| `0x0002` | `protocol.payload.rpc` | protocol | mvp | bool | - |
| `0x0003` | `protocol.payload.stream` | protocol | mvp | bool | - |
| `0x0009` | `protocol.reservedRequestIdWidth` | protocol | reserved | reserved | - |
| `0x0101` | `device.info` | device | draft | object | DeviceInfoCapability |
| `0x0401` | `firmware.update` | firmware | draft | object | FirmwareUpdateCapabilities |
| `0x0801` | `video.stream` | video | draft | object | VideoStreamCapabilities |
| `0x0901` | `audio.algorithm` | audio | stable | object | AudioAlgorithmCapability |
| `0x0902` | `audio.stream` | audio | draft | object | AudioStreamCapabilities |
| `0x0E01` | `network.interface` | network | draft | object | NetworkInterfaceCapability |
| `0x0E02` | `network.ip` | network | draft | object | NetworkIpCapability |
| `0x0E03` | `network.wifi` | network | draft | object | NetworkWifiCapabilities |
| `0x0E04` | `network.ap` | network | draft | object | NetworkApCapabilities |
