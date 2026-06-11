---
status: draft
contract: false
generated: false
domain: signage
feature: signage.playlist
registry:
lastReviewed: 2026-06-11
---

# signage.playlist

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 读取和全量替换数字标牌播放列表配置。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否；媒体内容本身不通过本方法传输。 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | playlist/item/settings 完整 schema、全量替换删除规则和媒体类型枚举仍需确认。 |

## 1. 功能说明

`signage.playlist` 只用于数字标牌播放业务，覆盖 playlist、item 和播放设置。它落实 signage flow 中 legacy `SetPlaylistConfig` / `GetPlaylistConfig`，其中 `SetPlaylistConfig` 按全量替换处理。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 获取当前 playlist config、全量替换 playlist config、配置变化事件。 |
| 不包含 | 媒体 URL refresh；属于 `signage.media`。 |
| 不包含 | Launcher 外观配置；属于 `software.appearanceConfig`。 |
| 不包含 | 关机/重启计划；属于 `system.lifecycle`。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `signage.getPlaylistConfig` | query | 读取当前播放列表配置。 | `GetPlaylistConfigParams` | `PlaylistConfig` | 否 | draft |
| `signage.setPlaylistConfig` | command | 全量替换播放列表配置。 | `SetPlaylistConfigParams` | `PlaylistConfig` | 是，变化后触发 `signage.playlistConfigChanged`。 | draft |

### 3.1 `signage.getPlaylistConfig`

#### 请求参数 Params：`GetPlaylistConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `playlistIds` | string[] | no | playlist ids | all | 可选过滤。 |

#### 返回结果 Result：`PlaylistConfig`

字段见 6.2。

### 3.2 `signage.setPlaylistConfig`

| 项 | 内容 |
|---|---|
| 目的 | 全量替换设备当前播放列表配置。 |
| 调用类型 | command |
| Params Schema | `SetPlaylistConfigParams` |
| Result Schema | `PlaylistConfig` |
| 事件触发 | 配置实际变化后触发 `signage.playlistConfigChanged`。 |
| 幂等 / 异步 | 同一 config version 可幂等；媒体下载或缓存不由本方法同步完成。 |

#### 请求参数 Params：`SetPlaylistConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `PlaylistConfig` | yes | see schema | none | 完整播放列表配置。 |
| `replaceMode` | enum | no | `full`, `merge` | `full` | P0 使用 `full`；未出现在新 config 中的旧项会删除。 |

#### 返回结果 Result：`PlaylistConfig`

字段见 6.2。

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `signage.playlistConfigChanged` | 播放列表配置被 set 或设备策略修改。 | `PlaylistConfigChangedEvent` | 刷新播放列表和本地下载队列。 | draft |

### 4.1 `signage.playlistConfigChanged`

#### Payload：`PlaylistConfigChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `PlaylistConfig` | yes | see schema | none | 变化后的配置摘要或完整配置。 |
| `changedFields` | string[] | no | field paths | omitted | 变化字段。 |
| `reason` | enum | no | `user_request`, `server_sync`, `device_policy`, `unknown` | `unknown` | 变化原因。 |

## 5. Capability

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `signage.playlist` | capability 名称。 |
| `supportsFullReplace` | boolean | yes | `true`, `false` | 是否支持全量替换。 |
| `supportedItemTypes` | string[] | no | `image`, `video`, `web`, `clock`, `slideshow`, `unknown` | 支持播放项类型。 |
| `maxItems` | uint32 | no | `0..uint32 max` | 最大播放项数量。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
PlaylistConfig
  playlists: Playlist[]
Playlist
  items: PlaylistItem[]
```

### 6.2 `PlaylistConfig`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `version` | string | no | opaque version | omitted | 配置版本。 |
| `playlists` | `Playlist[]` | yes | array | none | 播放列表数组。 |
| `activePlaylistId` | string | no | playlist id | omitted | 当前启用列表。 |

### 6.3 `Playlist`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `playlistId` | string | yes | opaque id | none | 播放列表 ID。 |
| `name` | string | no | max length TBD | omitted | 名称。 |
| `items` | `PlaylistItem[]` | yes | array | none | 播放项。 |

### 6.4 `PlaylistItem`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `itemId` | string | yes | opaque id | none | 播放项 ID。 |
| `type` | enum | yes | `image`, `video`, `web`, `clock`, `slideshow`, `unknown` | none | 播放项类型。 |
| `url` | string | no | URL | omitted | 媒体或网页 URL。 |
| `durationSeconds` | uint32 | no | `0..uint32 max` | omitted | 播放时长。 |
| `settings` | object | no | type-specific | omitted | 类型相关配置，采纳前需强类型化。 |

## 7. JSON 示例

```json
{
  "id": 801,
  "method": "signage.setPlaylistConfig",
  "params": {
    "replaceMode": "full",
    "config": {
      "version": "pl-2026-06-11",
      "activePlaylistId": "main",
      "playlists": [
        {
          "playlistId": "main",
          "name": "Lobby",
          "items": [
            {
              "itemId": "welcome-video",
              "type": "video",
              "url": "https://example.invalid/media/welcome.mp4",
              "durationSeconds": 30
            }
          ]
        }
      ]
    }
  }
}
```

```json
{
  "id": 801,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "version": "pl-2026-06-11",
    "activePlaylistId": "main",
    "playlists": [
      {
        "playlistId": "main",
        "name": "Lobby",
        "items": [
          {
            "itemId": "welcome-video",
            "type": "video",
            "url": "https://example.invalid/media/welcome.mp4",
            "durationSeconds": 30
          }
        ]
      }
    ]
  }
}
```

## 8. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `SetPlaylistConfig` | Server -> Device | `signage.setPlaylistConfig` | `[REVIEW-OK]` |
| `GetPlaylistConfig` | Server -> Device | `signage.getPlaylistConfig` | `[REVIEW-OK]` |

## 9. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 full replace、get/set schema 一致、item type validation。 |

## 10. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `settings` 是否需要按 clock/web/slideshow/video/image 强类型化？ | schema / adoption | 采纳前必须强类型化 P0 item types。 | `[REVIEW-FIX]` |
| 第二次 full replace 是否删除旧 item？ | behavior | 按 flow 假设删除未出现旧项。 | `[REVIEW-DRAFT]` |
