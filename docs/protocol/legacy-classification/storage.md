# storage Legacy Classification

本文件从 `legacy-protocol-classification.csv` 按 domain 切分生成，用于后续撰写 `registry/domains/storage/domain.yaml` 前的人工审查。

| Source | File | Line | Type | Legacy Wire | Command ID | Class | Method | Event | Config Name | Capability | AXTP Method | AXTP Event | Protocol Doc | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| axdp_hid | docs/legacy-protocols/AXDP源码协议扫描清单.md | 120 | command | CommonGetDDRCapacity | 0xC0067 / 0x0067 -> 0x00E7 |  | CommonGetDDRCapacity |  |  | storage.disk | storage.getDiskState |  |  | medium | 磁盘/容量信息归 storage.disk。 |
| vm33_http_json | docs/legacy-protocols/VM33协议文档.md | 3722 | method | DiskServer.GetDiskSpace |  | DiskServer | GetDiskSpace |  |  | storage.disk | storage.getDiskState |  |  | medium | 磁盘/容量信息归 storage.disk。 |
| rooms_ws_json | docs/legacy-protocols/Rooms协议文档.md | 2373 | method | SelectRecord |  |  | SelectRecord |  |  | storage.recording | storage.listRecordings |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| rooms_ws_json | docs/legacy-protocols/Rooms协议文档.md | 2413 | method | RemoveRecord |  |  | RemoveRecord |  |  | storage.recording | storage.deleteRecording |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| vm33_http_json | docs/legacy-protocols/VM33协议文档.md | 1515 | method | Record.List |  | Record | List |  |  | storage.recording | storage.listRecordings |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| vm33_http_json | docs/legacy-protocols/VM33协议文档.md | 1555 | method | Record.DateList |  | Record | DateList |  |  | storage.recording | storage.listRecordings |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| vm33_http_json | docs/legacy-protocols/VM33协议文档.md | 1590 | method | Record.GetSd |  | Record | GetSd |  |  | storage.recording | storage.listRecordings |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| vm33_http_json | docs/legacy-protocols/VM33协议文档.md | 1622 | method | Record.FormatSd |  | Record | FormatSd |  |  | storage.recording | storage.listRecordings |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| vm33_http_json | docs/legacy-protocols/VM33协议文档.md | 1685 | method | Record.DeleteMP4 |  | Record | DeleteMP4 |  |  | storage.recording | storage.deleteRecording |  |  | medium | 录像文件查询/删除归 storage.recording。 |
| rooms_ws_json | docs/legacy-protocols/Rooms协议文档.md | 3439 | event | SDStatus |  |  |  | SDStatus |  | storage.sdCard |  | storage.sdCardStateChanged |  | high | SD 卡状态、信息和格式化归 storage.sdCard。 |
| rooms_ws_json | docs/legacy-protocols/Rooms协议文档.md | 3635 | method | FormatSd |  |  | FormatSd |  |  | storage.sdCard | storage.formatSdCard |  |  | high | SD 卡状态、信息和格式化归 storage.sdCard。 |
| rooms_ws_json | docs/legacy-protocols/Rooms协议文档.md | 3682 | method | GetSDInfo |  |  | GetSDInfo |  |  | storage.sdCard | storage.getSdCardState |  |  | high | SD 卡状态、信息和格式化归 storage.sdCard。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 162 | method | GetSDInfo |  |  | GetSDInfo |  |  | storage.sdCard | storage.getSdCardState |  |  | high | SD 卡状态、信息和格式化归 storage.sdCard。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 177 | method | FormatSd |  |  | FormatSd |  |  | storage.sdCard | storage.formatSdCard |  |  | high | SD 卡状态、信息和格式化归 storage.sdCard。 |
