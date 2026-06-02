# signage Legacy Classification

本文件从 `legacy-protocol-classification.csv` 按 domain 切分生成，用于后续撰写 `registry/domains/signage/domain.yaml` 前的人工审查。

| Source | File | Line | Type | Legacy Wire | Command ID | Class | Method | Event | Config Name | Capability | AXTP Method | AXTP Event | Protocol Doc | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 504 | method | GetPlaylistItemUrl |  |  | GetPlaylistItemUrl |  |  | signage.media | signage.listMedia |  |  | high | 播放项资源 URL 与媒体资源归 signage.media。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 557 | method | GetAppearanceConfig |  |  | GetAppearanceConfig |  |  | signage.osd | signage.getOsdConfig |  |  | medium | 数字标牌外观/面板配置归 signage.osd。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 580 | method | SetAppearanceConfig |  |  | SetAppearanceConfig |  |  | signage.osd | signage.setOsdConfig |  |  | medium | 数字标牌外观/面板配置归 signage.osd。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 372 | method | SetPlaylistConfig |  |  | SetPlaylistConfig |  |  | signage.playlist | signage.setPlaylistConfig |  |  | high | 播放列表配置归 signage.playlist。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 468 | method | GetPlaylistConfig |  |  | GetPlaylistConfig |  |  | signage.playlist | signage.getPlaylistConfig |  |  | high | 播放列表配置归 signage.playlist。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 677 | method | GetScheduleConfig |  |  | GetScheduleConfig |  |  | signage.schedule | signage.getScheduleConfig |  |  | high | 数字标牌播放计划归 signage.schedule。 |
| signage_sdk | docs/legacy-protocols/NearHub-Launcher数字标牌设备管理通用管理命令.md | 712 | method | SetScheduleConfig |  |  | SetScheduleConfig |  |  | signage.schedule | signage.setScheduleConfig |  |  | high | 数字标牌播放计划归 signage.schedule。 |
