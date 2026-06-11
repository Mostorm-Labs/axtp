---
status: draft
contract: false
generated: false
domain: signage
feature: signage.media
registry:
lastReviewed: 2026-06-11
---

# signage.media

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 为数字标牌播放项刷新媒体 URL 和描述媒体引用。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC |
| 是否使用 STREAM | 否；本 feature 返回 URL，不承载媒体数据面。 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | `url` 与 `urls` 是否保留二选一、URL TTL 和签名字段仍需确认。 |

## 1. 功能说明

`signage.media` 只用于数字标牌播放业务中的媒体资源引用。它落实 signage flow 中 legacy `GetPlaylistItemUrl`：设备发现播放项 URL 即将过期时，向服务端刷新该播放项的可用 URL。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 播放项 URL refresh、URL 过期时间、单 URL 或多 URL 返回。 |
| 不包含 | playlist 全量配置；属于 `signage.playlist`。 |
| 不包含 | Launcher 壳层外观；属于 `software.appearanceConfig`。 |
| 不包含 | 媒体文件上传/下载数据面；后续可由 `file.transfer` 或业务 stream 承载。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `signage.refreshPlaylistItemUrl` | query / action | 刷新播放项媒体 URL。 | `RefreshPlaylistItemUrlParams` | `PlaylistItemUrlResult` | 否 | draft |

### 3.1 `signage.refreshPlaylistItemUrl`

| 项 | 内容 |
|---|---|
| 目的 | 根据 `itemId` 获取新的媒体 URL 或 URL 列表。 |
| 调用类型 | query / action |
| Params Schema | `RefreshPlaylistItemUrlParams` |
| Result Schema | `PlaylistItemUrlResult` |
| 常见错误 | `NOT_FOUND`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE`, `INTERNAL_ERROR` |

#### 请求参数 Params：`RefreshPlaylistItemUrlParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `itemId` | string | yes | playlist item id | none | 播放项 ID。 |
| `playlistId` | string | no | playlist id | omitted | 所属播放列表。 |
| `reason` | enum | no | `expiring`, `expired`, `startup`, `retry`, `unknown` | `expiring` | 刷新原因。 |

#### 返回结果 Result：`PlaylistItemUrlResult`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `itemId` | string | yes | playlist item id | none | 播放项 ID。 |
| `url` | string | no | HTTPS URL | omitted | 单资源 URL；与 `urls` 至少一个存在。 |
| `urls` | string[] | no | HTTPS URLs | omitted | 多资源 URL。 |
| `expiresAt` | string timestamp | no | RFC 3339 | omitted | URL 过期时间。 |
| `ttlSeconds` | uint32 | no | `0..uint32 max` | omitted | 相对过期秒数。 |

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| none | URL refresh 由 request/response 表达。 | none | 事件不是必需；如要做预取或失效广播，后续另评审。 | draft |

## 5. Capability

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `signage.media` | capability 名称。 |
| `supportsRefreshPlaylistItemUrl` | boolean | yes | `true`, `false` | 是否支持 URL refresh。 |
| `supportsMultipleUrls` | boolean | no | `true`, `false` | 是否可能返回 `urls`。 |

## 6. JSON 示例

```json
{
  "id": 701,
  "method": "signage.refreshPlaylistItemUrl",
  "params": {
    "playlistId": "<PLAYLIST_ID>",
    "itemId": "<ITEM_ID>",
    "reason": "expiring"
  }
}
```

```json
{
  "id": 701,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "itemId": "<ITEM_ID>",
    "url": "https://example.invalid/media/item.mp4",
    "expiresAt": "2026-06-11T12:00:00Z",
    "ttlSeconds": 3600
  }
}
```

## 7. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `GetPlaylistItemUrl` | Device -> Server | `signage.refreshPlaylistItemUrl` | `[REVIEW-OK]` |

## 8. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method IDs | `TBD after adoption` |
| Conformance | 需覆盖单 URL、多 URL、过期时间、item not found。 |

## 9. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| legacy `url` 和 `urls` 是否都要保留？ | schema | 先两者都允许，采纳前确认统一形态。 | `[REVIEW-ASK]` |
| URL 是否必须 HTTPS、是否需要签名字段？ | security | 示例用 HTTPS；签名细节不进协议。 | `[REVIEW-ASK]` |
