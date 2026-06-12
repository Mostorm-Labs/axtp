# signage Legacy Classification

本文件从 `legacy-protocol-classification.csv` 按 domain 切分生成，用于后续撰写 `registry/domains/signage/domain.yaml` 前的人工审查。

> **注意**：部分旧 signage_sdk 条目已按语义重新分类到其他域——`signage.osd` 迁至 `software.config`，`signage.schedule` 定域 `system.lifecycle`，`signage.media` 合并进 `signage.playlist`。因此本表包含映射到 `software.*`、`system.*` 等非 signage 域的条目。

| Source | File | Line | Type | Legacy Wire | Command ID | Class | Method | Event | Config Name | Capability | AXTP Method | AXTP Event | Protocol Doc | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 504 | method | GetPlaylistItemUrl |  |  | GetPlaylistItemUrl |  |  | signage.playlist | signage.getPlaylistItemUrl |  | docs/protocol/signage/signage.playlist.md | high | URL 刷新是播放项级操作，已合并进 signage.playlist。 |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 557 | method | GetAppearanceConfig |  |  | GetAppearanceConfig |  |  | software.config | software.getConfig |  | docs/protocol/software/software.config.md | high | 外观配置实为 Launcher 软件配置，已迁至 software.config (target: "launcher")。 |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 580 | method | SetAppearanceConfig |  |  | SetAppearanceConfig |  |  | software.config | software.setConfig |  | docs/protocol/software/software.config.md | high | 外观配置实为 Launcher 软件配置，已迁至 software.config (target: "launcher")。 |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 372 | method | SetPlaylistConfig |  |  | SetPlaylistConfig |  |  | signage.playlist | signage.setPlaylistConfig |  | docs/protocol/signage/signage.playlist.md | high | 播放列表配置归 signage.playlist。 |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 468 | method | GetPlaylistConfig |  |  | GetPlaylistConfig |  |  | signage.playlist | signage.getPlaylistConfig |  | docs/protocol/signage/signage.playlist.md | high | 播放列表配置归 signage.playlist。 |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 677 | method | GetScheduleConfig |  |  | GetScheduleConfig |  |  | system.lifecycle | system.getRebootSchedule / system.getShutdownSchedule |  | docs/protocol/system/system.lifecycle.md | high | 定时关机/重启是设备生命周期，已定域 system.lifecycle。 |
| signage_sdk | docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md | 712 | method | SetScheduleConfig |  |  | SetScheduleConfig |  |  | system.lifecycle | system.setRebootSchedule / system.setShutdownSchedule |  | docs/protocol/system/system.lifecycle.md | high | 定时关机/重启是设备生命周期，已定域 system.lifecycle。 |
