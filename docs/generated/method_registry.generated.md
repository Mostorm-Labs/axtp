# Method Registry

| methodId | name | domain | status | request | response | legacy |
|---:|---|---|---|---|---|---|
| `0x0101` | `device.getInfo` | device | mvp | DeviceGetInfoRequest | DeviceGetInfoResponse | - |
| `0x0201` | `capability.supportedMethods` | capability | mvp | CapabilitySupportedMethodsRequest | CapabilitySupportedMethodsResponse | - |
| `0x0402` | `firmware.begin` | firmware | mvp | FirmwareBeginRequest | FirmwareBeginResponse | - |
| `0x0403` | `firmware.end` | firmware | mvp | FirmwareEndRequest | FirmwareEndResponse | - |
| `0x0404` | `firmware.verify` | firmware | mvp | FirmwareVerifyRequest | FirmwareVerifyResponse | - |
| `0x0405` | `firmware.apply` | firmware | mvp | FirmwareApplyRequest | FirmwareApplyResponse | - |
| `0x0501` | `stream.open` | stream | draft | StreamOpenRequest | StreamOpenResponse | - |
| `0x0601` | `display.getBrightness` | display | mvp | DisplayGetBrightnessRequest | DisplayGetBrightnessResponse | - |
| `0x0602` | `display.setBrightness` | display | mvp | DisplaySetBrightnessRequest | CommonEmptyResponse | - |
| `0x0901` | `audio.getAlgorithmConfig` | audio | draft | AudioGetAlgorithmConfigRequest | AudioAlgorithmConfig | - |
| `0x0902` | `audio.setAlgorithmConfig` | audio | draft | AudioSetAlgorithmConfigRequest | AudioSetAlgorithmConfigResponse | - |
| `0x090D` | `audio.getAlgorithmCapabilities` | audio | draft | AudioGetAlgorithmCapabilitiesRequest | AudioGetAlgorithmCapabilitiesResponse | - |
| `0x090E` | `audio.resetAlgorithmConfig` | audio | draft | AudioResetAlgorithmConfigRequest | AudioSetAlgorithmConfigResponse | - |
| `0x0E07` | `network.getApInfo` | network | draft | NetworkGetApInfoRequest | NetworkGetApInfoResponse | - |
