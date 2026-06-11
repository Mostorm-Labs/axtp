# AXTP signage.playlist 协议草案

版本：v0.6

归属域：`signage`

Capability ID：`signage.playlist`

适用范围：播放列表、播放项、列表状态和播放项资源 URL 刷新。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `signage.playlist` capability | 本文是按 Naming and Taxonomy spec 创建的单 feature 治理草案。 | 人工确认业务语义、schema 和 legacyRefs 后进入 `registry/domains/signage/domain.yaml`。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |
| `[REVIEW-RESOLVED]` | `signage.media` 合并 | 播放项 URL 刷新功能已从 `signage.media` 合并到本草案。`signage.media` 草案可删除。 | — |

---

## 1. 文档定位

`signage.playlist` 定义：数字标牌播放列表的全量同步、查询、播放项管理和播放项资源 URL 刷新。

本文只描述 `signage.playlist` 这一项 capability。稳定事实必须写入 `registry/domains/signage/domain.yaml` 或相关 registry YAML，再由 Generator 生成 `protocol/axtp.protocol.yaml` 与 `docs/generated/*`。

**v0.2 变更说明：** 新增 `signage.getPlaylistItemUrl` 方法（原 `signage.media` URL 刷新功能），补充候选 schemas 和 JSON 示例。

**v0.3 变更说明：** 播放项类型新增 `unsplash`（Unsplash 图库幻灯片），新增 `UnsplashPhoto` schema；`signage.getPlaylistItemUrl` 返回结果新增 `photos` 字段。

**v0.4 变更说明：** `GetPlaylistItemUrlResult` 从顶层互斥字段（`url` / `urls` / `photos`）模式重构为 `type` + `settings` 显式类型判别模式，与 `PlaylistItem` 结构统一。新设计天然可扩展——新增播放项类型只需扩展 `type` 枚举和对应 `settings` 结构，不污染顶层 schema。

**v0.5 变更说明：** 关闭三个核心设计决策：(1) 播放列表全量替换确认为硬替换，不引入版本号或 soft-delete；(2) Unsplash 等带过期时间播放项的 URL 刷新确认为设备端主动 Pull 模式（设备调用 `getPlaylistItemUrl`）；(3) `clock` 类型播放项调用 `getPlaylistItemUrl` 时服务端返回 `NOT_SUPPORTED`（common error 0x0003）。

**v0.6 变更说明：** 关闭 `scheduled` 类型时间区间约束决策——采用分条件约束：(1) `startDate == endDate` 时 `startTime <= endTime`（单日范围，时间窗口必须落在同一天内）；(2) `startDate < endDate` 时允许 `startTime > endTime`（多日范围下跨午夜播放，语义为 D 日 startTime → D+1 日 endTime）。

---

## 2. 业务需求

| 项 | 内容 |
|---|---|
| 需求来源 | NearHub Launcher 数字标牌设备管理 — 播放列表管理 |
| 目标用户 | 运维人员（通过云端管理控制台）、设备标牌播放器服务 |
| 目标行为 | 云端全量同步播放列表到设备；设备查询当前播放列表；设备检测到资源 URL 即将过期时主动请求刷新获取新 URL。 |
| 当前实现程度 | Drafted only — 无已有 registry/generated 事实 |

---

## 3. 域边界

| 项 | 决策 |
|---|---|
| Domain | `signage` |
| Feature | `signage.playlist` |
| Capability | `signage.playlist` |
| 不属于本文 | 播放控制（`signage.playback`）、设备外观（`device.appearance`）、系统调度（`system.lifecycle`） |

负责：

- `signage.playlist` 的能力发现、配置、状态、动作或事件。
- 与 `signage.playlist` 直接相关的 method/event/schema 草案。
- 播放项资源 URL 刷新（原 `signage.media` 已合并）。
- 已确认 legacy 协议到 `signage.playlist` 的语义归类。

不负责：

- 不承载其他 capability feature 的业务语义；跨域关系通过 schema 字段、引用或数据面 stream/file 表达。
- method/event 数值 ID 分配；数值以 registry/generated 为准。
- 未确认旧协议 payload 的稳定映射。

---

## 4. 协议决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 新增/修改/复用 | Modify | 扩展现有 v0.1 草案，新增 URL 刷新方法和详细 schema。 |
| 控制面 | RPC method/event | 业务控制不进入 Frame Header。 |
| 数据面 | None | 播放列表是配置同步操作，不涉及连续数据传输。 |
| WebSocket | RPC-only | WebSocket Unframed JSON 不承载 STREAM。 |

---

## 5. 候选 Capability

| Capability | 状态 | 说明 |
|---|---|---|
| `signage.playlist` | draft | 播放列表全量同步、查询和播放项资源 URL 刷新。 |

---

## 6. 候选 Methods

| Method | Params Schema | Result Schema | 方向 | 说明 | Review |
|---|---|---|---|---|---|
| `signage.getPlaylistCapabilities` | `PlaylistCapabilitiesParams` | `PlaylistCapabilitiesResult` | 双向 | 查询 `signage.playlist` 能力范围。 | [REVIEW-DRAFT] |
| `signage.getPlaylistConfig` | `GetPlaylistConfigParams` | `PlaylistConfigResult` | 双向 | 查询当前播放列表配置。 | [REVIEW-DRAFT] |
| `signage.setPlaylistConfig` | `SetPlaylistConfigParams` | `SetPlaylistConfigResult` | Server → Device | 全量同步播放列表配置（替换语义）。 | [REVIEW-DRAFT] |
| `signage.resetPlaylistConfig` | `ResetPlaylistConfigParams` | `SetPlaylistConfigResult` | Server → Device | 恢复默认播放列表配置。 | [REVIEW-DRAFT] |
| `signage.getPlaylistItemUrl` | `GetPlaylistItemUrlParams` | `GetPlaylistItemUrlResult` | Device → Server | 根据播放项 ID 获取最新资源 URL（URL 刷新）。`clock` 类型播放项无 URL 资源，调用此方法返回 `NOT_SUPPORTED`。 | [REVIEW-DRAFT] |

---

## 7. 候选 Events

| Event | Schema | 触发时机 | Review |
|---|---|---|---|
| `signage.playlistConfigChanged` | `PlaylistConfigChangedEvent` | 播放列表配置发生变更时发出。 | [REVIEW-DRAFT] |

---

## 8. 候选 Schemas

### `SetPlaylistConfigParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `playlists` | `Playlist[]` | yes | 播放列表配置数组。非空。 | [REVIEW-DRAFT] |

### `Playlist`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `id` | `string` (UUID) | yes | 播放列表唯一标识。 | [REVIEW-DRAFT] |
| `type` | `enum<default, scheduled>` | yes | 播放列表类型。`default` 为默认播放列表，`scheduled` 为定时播放列表。 | [REVIEW-DRAFT] |
| `startDate` | `string` (date) | no | 开始日期 (YYYY-MM-DD)。仅 `scheduled` 类型。`startDate <= endDate`。 | [REVIEW-DRAFT] |
| `endDate` | `string` (date) | no | 结束日期 (YYYY-MM-DD)。仅 `scheduled` 类型。`startDate <= endDate`。 | [REVIEW-DRAFT] |
| `startTime` | `string` (time) | no | 开始时间 (HH:mm:ss)。仅 `scheduled` 类型。**当 `startDate == endDate` 时，`startTime <= endTime`。** | [REVIEW-DRAFT] |
| `endTime` | `string` (time) | no | 结束时间 (HH:mm:ss)。仅 `scheduled` 类型。**当 `startDate == endDate` 时，`startTime <= endTime`；当 `startDate < endDate` 时允许跨午夜（`startTime > endTime`），语义为 D 日 startTime → D+1 日 endTime。** | [REVIEW-DRAFT] |
| `days` | `uint8[]` | no | 生效星期 (1-7, 1=周一)。仅 `scheduled` 类型。 | [REVIEW-DRAFT] |
| `items` | `PlaylistItem[]` | yes | 播放项数组。非空。 | [REVIEW-DRAFT] |

### `PlaylistItem`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `id` | `string` (UUID) | yes | 播放项唯一标识。 | [REVIEW-DRAFT] |
| `type` | `enum<image, slideshow, website, video, clock, unsplash>` | yes | 播放项类型。 | [REVIEW-DRAFT] |
| `duration` | `uint32` | yes | 播放时长（秒）。0-86400。默认 60。 | [REVIEW-DRAFT] |
| `sort` | `uint32` | yes | 播放顺序。非负整数。默认 0。 | [REVIEW-DRAFT] |
| `settings` | `object` | yes | 播放项设置。按 `type` 不同结构不同。 | [REVIEW-DRAFT] |

### `PlaylistItemSettings`（按 type 区分）

**image 类型：**

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `urls` | `string[]` | yes | 图片 URL 数组。 |
| `delaySeconds` | `uint32` | yes | 每个图片显示时长（秒）。`> 0`。默认 5。 |
| `expiresAt` | `uint64` | no | URL 过期时间（Unix 时间戳）。`null` 表示永不过期。 |

**video 类型：**

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `url` | `string` | yes | 视频 URL。 |
| `expiresAt` | `uint64` | no | URL 过期时间。`null` 表示永不过期。 |
| `muted` | `boolean` | no | 是否静音播放。默认 `false`。 |

**website 类型：**

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `url` | `string` | yes | 网站 URL。 |
| `ignoreCertificateError` | `boolean` | no | 忽略证书错误。默认 `false`。 |
| `refreshIntervalSecs` | `uint32` | no | 刷新间隔秒数。`null` 表示不刷新。 |

**clock 类型：**

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `clocks` | `ClockEntry[]` | yes | 时钟列表。 |
| `clocks[].timezone` | `string` (IANA) | yes | 时区标识。 |
| `clocks[].label` | `string` | yes | 城市标签。 |

**unsplash 类型：**

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `photos` | `UnsplashPhoto[]` | yes | Unsplash 图片列表（含摄影师信息）。 |
| `delaySeconds` | `uint32` | yes | 播放间隔秒数。`> 0`。默认 5。 |
| `expiresAt` | `uint64` | no | URL 过期时间（Unix 时间戳秒）。`null` 表示永不过期。 |

### `UnsplashPhoto`

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `url` | `string` | yes | 图片 URL。 |
| `user` | `object` | yes | 摄影师信息。 |
| `user.name` | `string` | yes | 摄影师名称。 |
| `user.link` | `string` | yes | 摄影师 Unsplash 主页链接。 |

### `GetPlaylistItemUrlParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `itemId` | `string` (UUID) | yes | 播放项唯一标识。 | [REVIEW-DRAFT] |

### `GetPlaylistItemUrlResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `type` | `enum<image, video, website, unsplash>` | yes | 播放项类型。用于判别 `settings` 的内部结构。`clock` 类型不涉及 URL 资源刷新。 | [REVIEW-DRAFT] |
| `settings` | `PlaylistItemSettings` | yes | 播放项刷新后的完整设置。结构与 `PlaylistItem.settings` 一致，按 `type` 对应不同内部字段。设备可直接用此值替换本地缓存的 `settings`。 | [REVIEW-DRAFT] |

`settings` 按 `type` 值对应 `PlaylistItemSettings` 的各类型子集：

| `type` | `settings` 包含字段 |
|---|---|
| `image` | `urls`, `delaySeconds`, `expiresAt` |
| `video` | `url`, `expiresAt`, `muted` |
| `website` | `url`, `ignoreCertificateError`, `refreshIntervalSecs` |
| `unsplash` | `photos`, `delaySeconds`, `expiresAt` |

---

## 9. JSON 示例

示例用于评审 request/response/event 语义，不是 generated 事实源。JSON 示例只写 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。

### `signage.setPlaylistConfig` request

```json
{
  "id": 1,
  "method": "signage.setPlaylistConfig",
  "params": {
    "playlists": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "default",
        "items": [
          {
            "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "type": "image",
            "duration": 60,
            "sort": 0,
            "settings": {
              "urls": ["https://example.com/resource/file-1.jpg", "https://example.com/resource/file-2.jpg"],
              "delaySeconds": 5,
              "expiresAt": 1704067200
            }
          },
          {
            "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
            "type": "video",
            "duration": 120,
            "sort": 1,
            "settings": {
              "url": "https://example.com/resource/video-1",
              "expiresAt": 1704153600,
              "muted": false
            }
          },
          {
            "id": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
            "type": "website",
            "duration": 300,
            "sort": 2,
            "settings": {
              "url": "https://example.com",
              "ignoreCertificateError": false,
              "refreshIntervalSecs": 300
            }
          },
          {
            "id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
            "type": "unsplash",
            "duration": 60,
            "sort": 3,
            "settings": {
              "photos": [
                {
                  "url": "https://images.unsplash.example.com/photo-1",
                  "user": {
                    "name": "Alice Photographer",
                    "link": "https://unsplash.example.com/@alice"
                  }
                },
                {
                  "url": "https://images.unsplash.example.com/photo-2",
                  "user": {
                    "name": "Bob Photographer",
                    "link": "https://unsplash.example.com/@bob"
                  }
                }
              ],
              "delaySeconds": 10,
              "expiresAt": 1704240000
            }
          }
        ]
      }
    ]
  }
}
```

### `signage.setPlaylistConfig` response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "ok": true
  }
}
```

### `signage.getPlaylistConfig` response（简化）

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "playlists": []
  }
}
```

### `signage.getPlaylistItemUrl` request

```json
{
  "id": 3,
  "method": "signage.getPlaylistItemUrl",
  "params": {
    "itemId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
}
```

### `signage.getPlaylistItemUrl` response（image 类型）

```json
{
  "id": 3,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "type": "image",
    "settings": {
      "urls": ["https://example.com/resource/file-1-new.jpg"],
      "delaySeconds": 5,
      "expiresAt": 1704153600
    }
  }
}
```

### `signage.getPlaylistItemUrl` response（video 类型）

```json
{
  "id": 4,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "type": "video",
    "settings": {
      "url": "https://example.com/resource/video-1-new.mp4",
      "expiresAt": 1704153600,
      "muted": false
    }
  }
}
```

### `signage.getPlaylistItemUrl` response（website 类型）

```json
{
  "id": 6,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "type": "website",
    "settings": {
      "url": "https://example.com/page",
      "ignoreCertificateError": false,
      "refreshIntervalSecs": 300
    }
  }
}
```

### `signage.getPlaylistItemUrl` response（unsplash 类型）

```json
{
  "id": 5,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "type": "unsplash",
    "settings": {
      "photos": [
        {
          "url": "https://images.unsplash.example.com/photo-1-new",
          "user": {
            "name": "Alice Photographer",
            "link": "https://unsplash.example.com/@alice"
          }
        },
        {
          "url": "https://images.unsplash.example.com/photo-2-new",
          "user": {
            "name": "Bob Photographer",
            "link": "https://unsplash.example.com/@bob"
          }
        }
      ],
      "delaySeconds": 10,
      "expiresAt": 1704326400
    }
  }
}
```

### failure response（播放项不存在）

```json
{
  "id": 3,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Playlist item not found.",
    "details": {
      "candidateError": "SIGNAGE_PLAYLIST_ITEM_NOT_FOUND"
    }
  }
}
```

### failure response（clock 类型不支持 URL 刷新）

```json
{
  "id": 7,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "URL refresh is not supported for clock type playlist items."
  }
}
```

---

## 10. 候选 Errors

| Error | 类别 | 说明 | Review |
|---|---|---|---|
| `NOT_SUPPORTED` (0x0003) | common | URL 刷新操作不支持当前播放项类型（如 `clock`）。 | [REVIEW-DRAFT] |
| `SIGNAGE_PLAYLIST_ITEM_NOT_FOUND` | business | 指定的播放项 ID 不存在于当前播放列表中。 | [REVIEW-DRAFT] |
| `SIGNAGE_PLAYLIST_EMPTY` | business | 播放列表数组为空或播放项数组为空。 | [REVIEW-DRAFT] |
| `SIGNAGE_PLAYLIST_URL_EXPIRED` | business | 刷新 URL 时发现资源已不可用。 | [REVIEW-DRAFT] |

---

## 11. Legacy 待映射

| 来源 | 旧协议条目 | 候选映射 | 状态 | 说明 |
|---|---|---|---|---|
| NearHub Launcher Signage | `SetPlaylistConfig` | `signage.setPlaylistConfig` | [REVIEW-DRAFT] | 方向 Server → Device；全量替换语义一致。旧指令状态为"已研发"。 |
| NearHub Launcher Signage | `GetPlaylistConfig` | `signage.getPlaylistConfig` | [REVIEW-DRAFT] | 方向双向；响应结构一致。旧指令状态为"已研发"。 |
| NearHub Launcher Signage | `GetPlaylistItemUrl` | `signage.getPlaylistItemUrl` | [REVIEW-DRAFT] | 方向 Device → Server；URL 刷新语义一致。旧指令状态为"已研发"。原映射为 `signage.media`，已重新定域。 |

---

## 12. Registry 草案输入

采纳本文后，domain YAML 至少应包含：

```yaml
capabilities:
  - name: signage.playlist
    status: draft

methods:
  - name: signage.getPlaylistCapabilities
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: PlaylistCapabilitiesParams
    responseSchema: PlaylistCapabilitiesResult
    capabilities:
      - signage.playlist
  - name: signage.getPlaylistConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: GetPlaylistConfigParams
    responseSchema: PlaylistConfigResult
    capabilities:
      - signage.playlist
  - name: signage.setPlaylistConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: SetPlaylistConfigParams
    responseSchema: SetPlaylistConfigResult
    capabilities:
      - signage.playlist
  - name: signage.resetPlaylistConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: ResetPlaylistConfigParams
    responseSchema: SetPlaylistConfigResult
    capabilities:
      - signage.playlist
  - name: signage.getPlaylistItemUrl
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: GetPlaylistItemUrlParams
    responseSchema: GetPlaylistItemUrlResult
    capabilities:
      - signage.playlist
    errors:
      - NOT_SUPPORTED
      - SIGNAGE_PLAYLIST_ITEM_NOT_FOUND
      - SIGNAGE_PLAYLIST_URL_EXPIRED

events:
  - name: signage.playlistConfigChanged
    id: TBD after adoption
    schema: PlaylistConfigChangedEvent
    capabilities:
      - signage.playlist
```

---

## 13. 采纳检查清单

- [ ] 08 已确认 domain.feature 粒度和 method/event 命名。
- [ ] 09 已确认 Domain/ID 规划和生成链路。
- [ ] 10 已确认 methodId、bitOffset、request/response schema。
- [ ] 11 已确认 eventId、eventMasks bitOffset、event schema。
- [ ] 12 已确认 errorCode 范围和错误归属。
- [ ] 13 已确认 schema fieldId、capabilityId、supportedMethods。
- [ ] YAML 写入后 Generator 能完整生成 `protocol/axtp.protocol.yaml` 和 `docs/generated/*`。

---

## 14. 待确认问题

1. `[REVIEW-RESOLVED]` `GetPlaylistItemUrlResult` 多态响应设计 — v0.4 已重构为 `type` + `settings` 显式类型判别模式，不再需要 `oneOf` 约束。
2. `[REVIEW-RESOLVED]` 播放列表全量替换语义 — 确认为硬替换，不引入版本号或 soft-delete。服务端是唯一权威，设备不编辑播放列表，不存在并发修改冲突。第二次全量下发删除未出现的旧 item。
3. `[REVIEW-RESOLVED]` `scheduled` 类型播放列表的时间区间约束 — 采用分条件约束：`startDate == endDate` 时 `startTime <= endTime`（单日范围，时间窗口落在同一天内）；`startDate < endDate` 时允许 `startTime > endTime`（多日范围下跨午夜播放，语义为匹配日期 D 的 startTime → D+1 日 endTime）。违反约束时返回 `RPC_PARAM_INVALID`（common error 0x0002），`details` 中说明具体违规字段。
4. `[REVIEW-RESOLVED]` URL 过期刷新方式 — 确认为设备端主动 Pull 模式。设备持有 `expiresAt` 时间戳，可自主调度刷新时机，主动调用 `signage.getPlaylistItemUrl` 获取新 URL。服务端不跟踪设备资源过期状态，不通过 `playlistConfigChanged` 事件推送 URL 刷新。
5. `[REVIEW-RESOLVED]` `clock` 类型播放项调用 `signage.getPlaylistItemUrl` — 服务端返回 `NOT_SUPPORTED`（common error 0x0003）。`clock` 类型不依赖远程 URL 资源，URL 刷新操作对该类型不适用。`NOT_SUPPORTED` 语义精确（操作不支持），`SIGNAGE_PLAYLIST_ITEM_NOT_FOUND` 有误导性（播放项实际存在）。
