# AXTP Legacy Migration Plan (Generated)

## Summary

This generated plan migrates legacy AXDP, VM33 and signage SDK protocol material into an AXTP v1 compatible compatibility layer. It does not modify AXTP Core. Registry changes are emitted as candidate patches only.

## Source Coverage

- Total legacy mappings: 418
- RPC method mappings: 361
- Event mappings: 11
- Capability mappings: 35
- STREAM mappings: 11
- Existing AXTP registry entries reused: 11

## Invariants

- AXTP v1 Standard Frame Header remains unchanged.
- PayloadType remains CONTROL=0x01, RPC=0x02, STREAM=0x03.
- Legacy compatibility is implemented by adapter code and generated mapping tables, not by AXTP Core changes.
- Bulk or continuous legacy data is mapped to STREAM. RPC is used only for setup, control and finalization.

## Migration Matrix

| Legacy source | Legacy object | Destination | Promotion | Notes |
|---|---|---|---|---|
| `axdp_hid` | `CommonSetExposureCompensationParam` / `0XC012A` | `rpc_method:camera.set.exposureCompensationParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetExposureCompensationParam` / `0XC012B` | `rpc_method:camera.get.exposureCompensationParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetBacklightCompensationParam` / `0XC012C` | `rpc_method:camera.set.backlightCompensationParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetBacklightCompensationParam` / `0XC012D` | `rpc_method:camera.get.backlightCompensationParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetHighlightSuppressionParam` / `0XC012E` | `rpc_method:camera.set.highlightSuppressionParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetHighlightSuppressionParam` / `0XC012F` | `rpc_method:camera.get.highlightSuppressionParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetShutterParam` / `0XC0130` | `rpc_method:camera.set.shutterParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetShutterParam` / `0XC0131` | `rpc_method:camera.get.shutterParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetImageStyle` / `0XC0132` | `rpc_method:camera.set.imageStyle` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetImageStyle` / `0XC0133` | `rpc_method:camera.get.imageStyle` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetPiPMode` / `0XC0134` | `rpc_method:camera.set.piPMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetPiPMode` / `0XC0135` | `rpc_method:camera.get.piPMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetROIDisplayState` / `0XC0136` | `rpc_method:camera.set.rOIDisplayState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetROIDisplayState` / `0XC0137` | `rpc_method:camera.get.rOIDisplayState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAudioMuteState` / `0XC0138` | `rpc_method:audio.set.audioMuteState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAudioMuteState` / `0XC0139` | `rpc_method:audio.get.audioMuteState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDefaultConfigJson` / `0XC013A` | `rpc_method:config.set.defaultConfigJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDefaultConfigJson` / `0XC013B` | `rpc_method:config.get.defaultConfigJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetRTSPStreamAddr` / `0XC013C` | `stream:diagnostic.set.rTSPStreamAddr` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetRTSPStreamAddr` / `0XC013D` | `stream:diagnostic.get.rTSPStreamAddr` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetLogData` / `0XC013E` | `stream:log.get.logData` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetMediaStatus` / `0XC013F` | `rpc_method:media.get.mediaStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonTestSDCardState` / `0XC0140` | `rpc_method:diagnostic.test.sDCardState` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonTestWIFIState` / `0XC0141` | `rpc_method:diagnostic.test.wIFIState` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonTestBluetoothState` / `0XC0142` | `rpc_method:diagnostic.test.bluetoothState` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonTestBadFlashBlock` / `0XC0143` | `rpc_method:diagnostic.test.badFlashBlock` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonSetVerticalScreenMode` / `0XC0144` | `rpc_method:camera.set.verticalScreenMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetVerticalScreenMode` / `0XC0145` | `rpc_method:camera.get.verticalScreenMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAutoFocusState` / `0XC0146` | `rpc_method:camera.set.autoFocusState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAutoFocusState` / `0XC0147` | `rpc_method:camera.get.autoFocusState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetBluetoothMacAddr` / `0XC0148` | `rpc_method:diagnostic.get.bluetoothMacAddr` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `BetaDeviceInfo` / `0x000B0002` | `rpc_method:device.getInfo` | `existing_registry_mapping` | Authoritative existing mapping retained. |
| `axdp_hid` | `BetaBrightnessSet` / `0x000B0042` | `rpc_method:display.setBrightness` | `existing_registry_mapping` | Authoritative existing mapping retained. |
| `axdp_hid` | `AlphaUpgradeInfo` / `0xA0001` | `rpc_method:firmware.begin` | `adapter_only` | Source status: Deprecated |
| `axdp_hid` | `AlphaUpgradeData` / `0xA0002` | `stream:firmware.ota` | `adapter_only` | Source status: Deprecated |
| `axdp_hid` | `AlphaDeviceInfo` / `0xA0003` | `rpc_method:device.getInfo` | `adapter_only` | Source status: Deprecated |
| `axdp_hid` | `AlphaDeviceType` / `0xA0004` | `rpc_method:device.getType` | `adapter_only` | Source status: Deprecated |
| `axdp_hid` | `CommonMultiChannelAudioRecordStart` / `0xA200063` | `rpc_method:audio.record.multiChannel.start` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonMultiChannelAudioRecordStop` / `0xA200064` | `rpc_method:audio.record.multiChannel.stop` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonMultiChannelAudioRecordData` / `0xA200065` | `stream:audio.record.multiChannel.data` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDebugJson` / `0xA500115` | `rpc_method:config.set.debugJson` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonGetDebugJson` / `0xA500116` | `rpc_method:config.get.debugJson` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `BetaDeviceReset` / `0xB0001` | `rpc_method:system.reset` | `candidate_registry_patch` | Source status: Compat |
| `axdp_hid` | `BetaDeviceInfo` / `0xB0002` | `rpc_method:device.getInfo` | `candidate_registry_patch` | Source status: Compat |
| `axdp_hid` | `BetaStartUpgrade` / `0xB0003` | `rpc_method:firmware.begin` | `adapter_only` | Source status: Compat/Deprecated |
| `axdp_hid` | `BetaStopUpgrade` / `0xB0004` | `rpc_method:firmware.end` | `adapter_only` | Source status: Compat/Deprecated |
| `axdp_hid` | `BetaUpgradeInfo` / `0xB0005` | `rpc_method:firmware.begin` | `adapter_only` | Source status: Compat/Deprecated |
| `axdp_hid` | `BetaUpgradeData` / `0xB0006` | `stream:firmware.ota` | `adapter_only` | Source status: Compat/Deprecated |
| `axdp_hid` | `BetaUpgradeInfoEx` / `0xB0011` | `rpc_method:firmware.begin` | `adapter_only` | Source status: Compat/Deprecated |
| `axdp_hid` | `BetaUpgradeDataEx` / `0xB0012` | `stream:firmware.ota` | `adapter_only` | Source status: Compat/Deprecated |
| `axdp_hid` | `CommonSetVideoMode` / `0xC0021` | `rpc_method:camera.set.videoMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetVideoMode` / `0xC0022` | `rpc_method:camera.get.videoMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetPeopleNumber` / `0xC0023` | `rpc_method:camera.get.peopleNumber` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetMicUsed` / `0xC0024` | `rpc_method:audio.set.micUsed` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonAudioRecord` / `0xC0025` | `rpc_method:audio.exec.audioRecord` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetTestResult` / `0xC0026` | `rpc_method:diagnostic.set.testResult` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonGetTestResult` / `0xC0027` | `rpc_method:diagnostic.get.testResult` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonSetEncryptedInfo` / `0xC0028` | `rpc_method:factory.set.encryptedInfo` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetEncryptedInfo` / `0xC0029` | `rpc_method:factory.get.encryptedInfo` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetGyroSlopeAngle` / `0xC002A` | `rpc_method:misc.get.gyroSlopeAngle` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetUacState` / `0xC002B` | `rpc_method:audio.set.uacState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetUacState` / `0xC002C` | `rpc_method:audio.get.uacState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonTestAudioConsistency` / `0xC002D` | `rpc_method:audio.test.audioConsistency` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonTestNetworkPort` / `0xC002E` | `rpc_method:diagnostic.test.networkPort` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonSetSpeakerTrackMode` / `0xC0031` | `rpc_method:camera.set.speakerTrackMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetSpeakerTrackMode` / `0xC0032` | `rpc_method:camera.get.speakerTrackMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetMirrorState` / `0xC0033` | `rpc_method:camera.set.mirrorState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetMirrorState` / `0xC0034` | `rpc_method:camera.get.mirrorState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetSpeakerTrackDelay` / `0xC0035` | `rpc_method:camera.set.speakerTrackDelay` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetSpeakerTrackDelay` / `0xC0036` | `rpc_method:camera.get.speakerTrackDelay` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetSplitScreenNumber` / `0xC0037` | `rpc_method:camera.set.splitScreenNumber` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetSplitScreenNumber` / `0xC0038` | `rpc_method:camera.get.splitScreenNumber` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetUsbName` / `0xC0039` | `rpc_method:usb.set.usbName` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetUsbName` / `0xC003A` | `rpc_method:usb.get.usbName` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetUsbPid` / `0xC003B` | `rpc_method:usb.set.usbPid` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetUsbPid` / `0xC003C` | `rpc_method:usb.get.usbPid` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetUsbVid` / `0xC003D` | `rpc_method:usb.set.usbVid` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetUsbVid` / `0xC003E` | `rpc_method:usb.get.usbVid` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetReboot` / `0xC003F` | `rpc_method:system.set.reboot` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetPowerLineFreq` / `0xC0040` | `rpc_method:misc.set.powerLineFreq` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetPowerLineFreq` / `0xC0041` | `rpc_method:misc.get.powerLineFreq` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDeviceUniqueId` / `0xC0042` | `rpc_method:device.get.deviceUniqueId` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDeviceUniqueId` / `0xC0043` | `rpc_method:device.set.deviceUniqueId` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAlgAuthContent` / `0xC0044` | `rpc_method:misc.get.algAuthContent` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAlgAuthContent` / `0xC0045` | `rpc_method:misc.set.algAuthContent` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetWdrState` / `0xC0046` | `rpc_method:camera.set.wdrState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetWdrState` / `0xC0047` | `rpc_method:camera.get.wdrState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetOsdMirrorState` / `0xC0048` | `rpc_method:camera.set.osdMirrorState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetOsdMirrorState` / `0xC0049` | `rpc_method:camera.get.osdMirrorState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAFCalibration` / `0xC004A` | `rpc_method:camera.set.aFCalibration` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonStartAudioTest` / `0xC004B` | `rpc_method:audio.start.audioTest` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonSetFlipState` / `0xC004C` | `rpc_method:camera.set.flipState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetFlipState` / `0xC004D` | `rpc_method:camera.get.flipState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetNoiseEliminationLevel` / `0xC004E` | `rpc_method:audio.get.noiseEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetNoiseEliminationLevel` / `0xC004F` | `rpc_method:audio.set.noiseEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetBootDetect` / `0xC0050` | `rpc_method:boot.get.bootDetect` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetReverberationEliminationLevel` / `0xC0051` | `rpc_method:audio.get.reverberationEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetReverberationEliminationLevel` / `0xC0052` | `rpc_method:audio.set.reverberationEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetEchoEliminationLevel` / `0xC0053` | `rpc_method:audio.get.echoEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetEchoEliminationLevel` / `0xC0054` | `rpc_method:audio.set.echoEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetRecordEqParams` / `0xC0055` | `rpc_method:audio.get.recordEqParams` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetRecordEqParams` / `0xC0056` | `rpc_method:audio.set.recordEqParams` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDefaultNoiseEliminationLevel` / `0xC0057` | `rpc_method:audio.get.defaultNoiseEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDefaultNoiseEliminationLevel` / `0xC0058` | `rpc_method:audio.set.defaultNoiseEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDefaultReverberationEliminationLevel` / `0xC0059` | `rpc_method:audio.get.defaultReverberationEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDefaultReverberationEliminationLevel` / `0xC005A` | `rpc_method:audio.set.defaultReverberationEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDefaultEchoEliminationLevel` / `0xC005B` | `rpc_method:audio.get.defaultEchoEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDefaultEchoEliminationLevel` / `0xC005C` | `rpc_method:audio.set.defaultEchoEliminationLevel` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDefaultRecordEqParams` / `0xC005D` | `rpc_method:audio.get.defaultRecordEqParams` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDefaultRecordEqParams` / `0xC005F` | `rpc_method:audio.set.defaultRecordEqParams` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAlgoParamsReset` / `0xC0060` | `rpc_method:misc.set.algoParamsReset` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetMuteLightEnhancement` / `0xC0061` | `rpc_method:audio.get.muteLightEnhancement` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetMuteLightEnhancement` / `0xC0062` | `rpc_method:audio.set.muteLightEnhancement` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonAudioRecordStart` / `0xC0063` | `rpc_method:audio.record.start` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonAudioRecordStop` / `0xC0064` | `rpc_method:audio.record.stop` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonAudioRecordData` / `0xC0065` | `stream:audio.record.data` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAFCalibration` / `0xC0066` | `rpc_method:camera.get.aFCalibration` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDDRCapacity` / `0xC0067` | `rpc_method:diagnostic.get.dDRCapacity` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetPanTiltZoom` / `0xC0068` | `rpc_method:camera.set.panTiltZoom` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetPanTiltZoom` / `0xC0069` | `rpc_method:camera.get.panTiltZoom` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDumpInfo` / `0xC006A` | `stream:log.get.dumpInfo` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAlgoEnable` / `0xC006B` | `rpc_method:misc.set.algoEnable` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAlgoEnable` / `0xC006C` | `rpc_method:misc.get.algoEnable` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetHidCall` / `0xC006D` | `rpc_method:usb.set.hidCall` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetHidCall` / `0xC006E` | `rpc_method:usb.get.hidCall` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetUsbSpeedMode` / `0xC006F` | `rpc_method:usb.set.usbSpeedMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetUsbSpeedMode` / `0xC0070` | `rpc_method:usb.get.usbSpeedMode` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetBootInfo` / `0xC0071` | `rpc_method:boot.get.bootInfo` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetBootErase` / `0xC0072` | `rpc_method:boot.set.bootErase` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetPrivacyEnable` / `0xC0073` | `rpc_method:privacy.set.privacyEnable` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetPrivacyEnable` / `0xC0074` | `rpc_method:privacy.get.privacyEnable` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetNDIState` / `0xC0101` | `rpc_method:network.set.nDIState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetNDIState` / `0xC0102` | `rpc_method:network.get.nDIState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetIPConfig` / `0xC0103` | `rpc_method:network.get.iPConfig` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDHCPState` / `0xC0104` | `rpc_method:network.set.dHCPState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDHCPState` / `0xC0105` | `rpc_method:network.get.dHCPState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetIPAddress` / `0xC0106` | `rpc_method:diagnostic.set.iPAddress` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetIPAddress` / `0xC0107` | `rpc_method:diagnostic.get.iPAddress` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetNetMask` / `0xC0108` | `rpc_method:network.set.netMask` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetNetMask` / `0xC0109` | `rpc_method:network.get.netMask` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetGateway` / `0xC010A` | `rpc_method:network.set.gateway` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetGateway` / `0xC010B` | `rpc_method:network.get.gateway` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetMacAddress` / `0xC010C` | `rpc_method:diagnostic.set.macAddress` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetMacAddress` / `0xC010D` | `rpc_method:diagnostic.get.macAddress` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetLensCenter` / `0xC010E` | `rpc_method:camera.set.lensCenter` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetConfigJson` / `0xC010F` | `rpc_method:config.set.configJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetConfigJson` / `0xC0110` | `rpc_method:config.get.configJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetFbfParamsStart` / `0xC0111` | `rpc_method:audio.set.fbfParamsStart` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetFbfParamsData` / `0xC0112` | `rpc_method:audio.set.fbfParamsData` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetFbfParamsStop` / `0xC0113` | `rpc_method:audio.set.fbfParamsStop` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetFbfParams` / `0xC0114` | `rpc_method:audio.get.fbfParams` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetRegionTracking` / `0xC0115` | `rpc_method:camera.get.regionTracking` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetRegionTracking` / `0xC0116` | `rpc_method:camera.set.regionTracking` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonPauseAiAlgThrd` / `0xC0117` | `rpc_method:misc.pause.aiAlgThrd` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonContinueAiAlgThrd` / `0xC0118` | `rpc_method:misc.resume.aiAlgThrd` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetNoTargetStrategyState` / `0xC0119` | `rpc_method:misc.set.noTargetStrategyState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetNoTargetStrategyState` / `0xC011A` | `rpc_method:misc.get.noTargetStrategyState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetStartupPosition` / `0xC011B` | `rpc_method:misc.set.startupPosition` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetStartupPosition` / `0xC011C` | `rpc_method:misc.get.startupPosition` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetMenuBarLanguage` / `0xC011D` | `rpc_method:misc.set.menuBarLanguage` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetMenuBarLanguage` / `0xC011E` | `rpc_method:misc.get.menuBarLanguage` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetRS232TestResult` / `0xC011F` | `rpc_method:diagnostic.get.rS232TestResult` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonTestKey` / `0xC0120` | `rpc_method:diagnostic.test.key` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonTestLed` / `0xC0121` | `rpc_method:diagnostic.test.led` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonSetDebugJson` / `0xC0122` | `rpc_method:config.set.debugJson` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonGetDebugJson` / `0xC0123` | `rpc_method:config.get.debugJson` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonSetViscaUdpPort` / `0xC0124` | `rpc_method:network.set.viscaUdpPort` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetViscaUdpPort` / `0xC0125` | `rpc_method:network.get.viscaUdpPort` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetHorTrackingStrategy` / `0xC0126` | `rpc_method:camera.set.horTrackingStrategy` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetHorTrackingStrategy` / `0xC0127` | `rpc_method:camera.get.horTrackingStrategy` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetVerTrackingStrategy` / `0xC0128` | `rpc_method:camera.set.verTrackingStrategy` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetVerTrackingStrategy` / `0xC0129` | `rpc_method:camera.get.verTrackingStrategy` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetReverberationSuppressionParam` / `0xC0149` | `rpc_method:audio.get.reverberationSuppressionParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetReverberationSuppressionParam` / `0xC014A` | `rpc_method:audio.set.reverberationSuppressionParam` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetManualFocusStatus` / `0xC014B` | `rpc_method:camera.set.manualFocusStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetManualFocusStatus` / `0xC014C` | `rpc_method:camera.get.manualFocusStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetWifiSignalIntensity` / `0xC014D` | `rpc_method:network.get.wifiSignalIntensity` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetCropCircleX` / `0xC014F` | `rpc_method:misc.set.cropCircleX` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetCropCircleY` / `0xC0150` | `rpc_method:misc.set.cropCircleY` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAudioEnergyThreshold` / `0xC0151` | `rpc_method:audio.set.audioEnergyThreshold` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAudioEnergy` / `0xC0152` | `rpc_method:audio.get.audioEnergy` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDeviceLoaderState` / `0xC0153` | `rpc_method:system.set.deviceLoaderState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetBTBQBMODE` / `0xC0154` | `rpc_method:bluetooth.set.bTBQBMODE` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetBTRestore` / `0xC0155` | `rpc_method:bluetooth.set.bTRestore` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetBTName` / `0xC0156` | `rpc_method:bluetooth.set.bTName` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetBTName` / `0xC0157` | `rpc_method:bluetooth.get.bTName` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetBatteryCap` / `0xC0158` | `rpc_method:bluetooth.get.batteryCap` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonAudioInputDetect` / `0xC0159` | `rpc_method:audio.exec.audioInputDetect` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetPairBluetoothMacAddr` / `0xC015A` | `rpc_method:diagnostic.set.pairBluetoothMacAddr` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetPairBluetoothMacAddr` / `0xC015B` | `rpc_method:diagnostic.get.pairBluetoothMacAddr` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetRadius` / `0xC015C` | `rpc_method:misc.set.radius` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSNErase` / `0xC015D` | `rpc_method:factory.eraseSn` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetCpuUniqueId` / `0xC015E` | `rpc_method:device.get.cpuUniqueId` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetManualFocusPosition` / `0xC015F` | `rpc_method:camera.set.manualFocusPosition` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetManualFocusPosition` / `0xC0160` | `rpc_method:camera.get.manualFocusPosition` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonPTZinfoErase` / `0xC0161` | `rpc_method:camera.erasePtzInfo` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetExternalSpeakerConfigJson` / `0xC0162` | `rpc_method:audio.get.externalSpeakerConfigJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetExternalSpeakerConfigJson` / `0xC0163` | `rpc_method:audio.set.externalSpeakerConfigJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetConfigJsonSubIndex` / `0xC0164` | `rpc_method:config.get.configJsonSubIndex` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetConfigJsonSubIndex` / `0xC0165` | `rpc_method:config.set.configJsonSubIndex` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetExternalDeviceInfo` / `0xC0166` | `rpc_method:device.get.externalDeviceInfo` | `candidate_registry_patch` | Source status: CheckDuplicate |
| `axdp_hid` | `CommonSetExternalDeviceInfo` / `0xC0166` | `rpc_method:device.set.externalDeviceInfo` | `candidate_registry_patch` | Source status: CheckDuplicate |
| `axdp_hid` | `CommonGetDefaultMuteKeyStatus` / `0xC0175` | `rpc_method:audio.get.defaultMuteKeyStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDefaultMuteKeyStatus` / `0xC0176` | `rpc_method:audio.set.defaultMuteKeyStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonTransferJrpcData` / `0xC0178` | `rpc_method:bridge.jsonRpc.call` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetTripsStatus` / `0xC0179` | `rpc_method:misc.get.tripsStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetTipsStatus` / `0xC017A` | `rpc_method:misc.set.tipsStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonStartTestKVM` / `0xC017B` | `stream:diagnostic.start.testKVM` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonGetPositionNumberJson` / `0xC017C` | `rpc_method:amx.get.positionNumberJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetPositionNumberJson` / `0xC017D` | `rpc_method:amx.set.positionNumberJson` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAudioTypeVol` / `0xC017E` | `rpc_method:audio.get.audioTypeVol` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAudioDoaConfig` / `0xC017F` | `rpc_method:audio.set.audioDoaConfig` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAudioDoaConfig` / `0xC0180` | `rpc_method:audio.get.audioDoaConfig` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDanteDevicelic` / `0xC0181` | `rpc_method:amx.get.danteDevicelic` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetDanteManufacturer` / `0xC0182` | `rpc_method:amx.get.danteManufacturer` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDanteDevicelic` / `0xC0183` | `rpc_method:amx.set.danteDevicelic` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetDanteManufacturer` / `0xC0184` | `rpc_method:amx.set.danteManufacturer` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonQueryRecordResponeStatus` / `0xC0185` | `rpc_method:misc.query.recordResponeStatus` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetConfigJsonBySn` / `0xC0186` | `rpc_method:factory.set.configJsonBySn` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetConfigJsonBySn` / `0xC0187` | `rpc_method:factory.get.configJsonBySn` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetVM33state` / `0xC0188` | `rpc_method:misc.set.vM33state` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonProductTestJsonByParam` / `0xC0189` | `rpc_method:diagnostic.run.productTestJsonByParam` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonGetSightAngle` / `0xC0190` | `rpc_method:camera.get.sightAngle` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetSightAngle` / `0xC0191` | `rpc_method:camera.set.sightAngle` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetAllChannelScanState` / `0xC0192` | `rpc_method:network.get.allChannelScanState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetAllChannelScanState` / `0xC0193` | `rpc_method:network.set.allChannelScanState` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonTestAging` / `0xC0194` | `rpc_method:diagnostic.test.aging` | `candidate_registry_patch` | Source status: Experimental/Diagnostic |
| `axdp_hid` | `CommonGetScreenEntitlementId` / `0xC0195` | `rpc_method:screen.get.screenEntitlementId` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetScreenEntitlementId` / `0xC0196` | `rpc_method:screen.set.screenEntitlementId` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonAudioBeamReport` / `0xC0201` | `rpc_method:amx.audioBeam.report` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonSetTipsPlay` / `0xC20006B` | `rpc_method:misc.set.tipsPlay` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `CommonGetTipsPlay` / `0xC20006C` | `rpc_method:misc.get.tipsPlay` | `candidate_registry_patch` | Source status: Active |
| `axdp_hid` | `UnknownCode` / `0xCFFFF` | `rpc_method:unknown.code` | `candidate_registry_patch` | Source status: Reserved |
| `signage_sdk` | `FormatSd` / `数字标牌设备管理通用管理命令:FormatSd` | `rpc_method:storage.formatSd` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetAppearanceConfig` / `数字标牌设备管理通用管理命令:GetAppearanceConfig` | `rpc_method:appearance.getConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetBindCode` / `数字标牌设备管理通用管理命令:GetBindCode` | `rpc_method:binding.getCode` | `candidate_registry_patch` | Source status: 研发中 |
| `signage_sdk` | `GetBindConfig` / `数字标牌设备管理通用管理命令:GetBindConfig` | `rpc_method:binding.getConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetDeviceInfo` / `数字标牌设备管理通用管理命令:GetDeviceInfo` | `rpc_method:device.getInfo` | `candidate_registry_patch` | Source status: 已研发 |
| `signage_sdk` | `GetLineInPreGain` / `数字标牌设备管理通用管理命令:GetLineInPreGain` | `rpc_method:audio.getLineInPreGain` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetLineOutVolume` / `数字标牌设备管理通用管理命令:GetLineOutVolume` | `rpc_method:audio.getLineOutVolume` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetNetworkInfo` / `数字标牌设备管理通用管理命令:GetNetworkInfo` | `rpc_method:network.getInfo` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetPlaylistConfig` / `数字标牌设备管理通用管理命令:GetPlaylistConfig` | `rpc_method:signage.getPlaylistConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetPlaylistItemUrl` / `数字标牌设备管理通用管理命令:GetPlaylistItemUrl` | `rpc_method:signage.getPlaylistItemUrl` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetSDInfo` / `数字标牌设备管理通用管理命令:GetSDInfo` | `rpc_method:storage.getSdInfo` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetScheduleConfig` / `数字标牌设备管理通用管理命令:GetScheduleConfig` | `rpc_method:schedule.getConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `GetUpdateConfig` / `数字标牌设备管理通用管理命令:GetUpdateConfig` | `rpc_method:update.getConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `KeepAlive` / `数字标牌设备管理通用管理命令:KeepAlive` | `rpc_method:system.keepAlive` | `candidate_registry_patch` | Source status: 已研发 |
| `signage_sdk` | `KeepAlive` / `数字标牌设备管理通用管理命令:KeepAlive` | `event:keepalive.keepAliveReceived` | `candidate_registry_patch` | Source status: 已研发 |
| `signage_sdk` | `NotifyLogUploadResult` / `数字标牌设备管理通用管理命令:NotifyLogUploadResult` | `rpc_method:log.notifyUploadResult` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `OnBindState` / `数字标牌设备管理通用管理命令:OnBindState` | `event:setbindconfig.bindState` | `candidate_registry_patch` | Source status: 研发中 |
| `signage_sdk` | `OnTelemetryReport` / `数字标牌设备管理通用管理命令:OnTelemetryReport` | `event:onbindstate.telemetryReport` | `candidate_registry_patch` | Source status: 已研发 |
| `signage_sdk` | `RemoteUpgrade` / `数字标牌设备管理通用管理命令:RemoteUpgrade` | `rpc_method:firmware.upgradeByUrl` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `RequestLogUpload` / `数字标牌设备管理通用管理命令:RequestLogUpload` | `rpc_method:log.requestUpload` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `ResetConfig` / `数字标牌设备管理通用管理命令:ResetConfig` | `rpc_method:system.resetConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `SetAppearanceConfig` / `数字标牌设备管理通用管理命令:SetAppearanceConfig` | `rpc_method:appearance.setConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `SetBindConfig` / `数字标牌设备管理通用管理命令:SetBindConfig` | `rpc_method:binding.setConfig` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `SetDeviceName` / `数字标牌设备管理通用管理命令:SetDeviceName` | `rpc_method:device.setName` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `SetLineInPreGain` / `数字标牌设备管理通用管理命令:SetLineInPreGain` | `rpc_method:audio.setLineInPreGain` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `SetLineOutVolume` / `数字标牌设备管理通用管理命令:SetLineOutVolume` | `rpc_method:audio.setLineOutVolume` | `candidate_registry_patch` | Source status: 未研发 |
| `signage_sdk` | `SetPlaylistConfig` / `数字标牌设备管理通用管理命令:SetPlaylistConfig` | `rpc_method:signage.setPlaylistConfig` | `candidate_registry_patch` | Source status: 未研发 |
| ... | ... | ... | ... | 158 additional mappings are listed in `legacy-to-axtp-map.generated.yaml`. |

## Candidate Registry Patch Summary

- Methods to add: 336
- Events to add: 11
- Capabilities to add: 283
- Schemas to add: 717
- Legacy mappings to add or merge: 372

## Promotion Decisions

- Existing mappings such as `BetaDeviceInfo -> device.getInfo` and `BetaBrightnessSet -> display.setBrightness` remain authoritative.
- Deprecated AXDP commands are retained as adapter-only mappings unless they target an already registered AXTP method.
- VM33 JSON Class/Method aliases are promoted as draft candidate methods when they represent request/response control or query operations.
- VM33 notify/subscribe items are promoted as candidate events.
- VM33 Config Name rows become candidate capabilities because they describe device configuration features rather than one-off commands.
- Firmware/file/log/media/raw streams are represented as STREAM profiles and must not place large chunks into RPC bodies.

## Unresolved Source Issues

- [P0] 协议层缺失: 在外层引入 UTFP Frame Header；业务层保留 JSON_RPC Payload
- [P0] Seq 语义过窄: v2 引入 messageId/requestId；Seq 仅保留为兼容字段
- [P0] Notify结构不统一: 统一为 op=6 Event，d.event/d.eventId/timestamp/data
- [P0] 错误码过粗: 建立 100/2xx/3xx/4xx/5xx/6xx/7xx/8xx/9xx 错误码体系
- [P1] Class/Method字符串过重: 建立 MethodId 注册表，低带宽链路使用 methodId
- [P1] Config过于万能: 保留 config.* 通用能力，但核心配置项进入 Config Name Registry
- [P1] 文件/升级阻塞式接口: 返回 taskId，进度与结果通过 task.progress/task.completed 事件
- [P1] multipart关联规则不足: FileTransfer/Firmware PayloadType 定义 transferId/offset/chunkSize/md5/crc
- [P1] 字段命名不一致: v2 全部使用稳定 methodName；v1 作为 alias
- [P2] 文档JSON语法错误: 协议源用机器可读 YAML/JSON 维护并自动生成文档
- [P1] 敏感信息风险: 敏感字段 Get 默认脱敏；需要权限和安全通道
- [P1] 配置版本兼容: 每个配置项增加 schemaVersion/minFirmware/maxFirmware
- `migration/legacy-sources/extracted` and `migration/legacy-sources/normalized` were absent; this run bootstrapped directly from current raw legacy files.
- Several legacy rows lack detailed request/response field definitions. Generated schemas therefore preserve legacy payload bytes plus status metadata until normalized field-level schemas are available.

## Implementation Order

1. Review `legacy-to-axtp-map.generated.yaml` for mapping correctness.
2. Review `registry-patches.generated.yaml` domain-by-domain before applying any patch to source registries.
3. Implement the C++ legacy adapter using the generated mapping table as data, not hard-coded switch statements.
4. Run generated test vectors against the adapter and AXTP runtime boundary.
