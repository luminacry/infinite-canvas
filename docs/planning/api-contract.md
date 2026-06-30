# API 契约（前后端共建基准）

> 全栈均由 Claude 实现。**任何字段变更必须先改本文件再改代码**。
>
> 实现状态（截至当前）：
> - ✅ 已实现：auth/* 全部、credits/*（balance/ledger/redeem）、generate/image、generate/estimate、me/generations、me/gallery、admin/*（users/generations/codes/pricing/channels/stats）
> - ⏳ 未实现：generate/video、generate/audio、generate/text(SSE)（属 M3b）

## 通用约定

- 统一响应体：`{ code: number, data: T | null, msg: string }`，`code === 0` 为成功。
- 鉴权：登录后服务端下发 **httpOnly Cookie**（名 `ic_session`）。前端**无需**手动带 token，浏览器自动携带；请求统一 `withCredentials`/`credentials: "include"`。
- HTTP 状态与 `code` 并行：401 未登录、403 无权限、402 算力点不足、429 限流。前端按 `code` 出文案。
- 金额/算力点均为**整数**。
- 列表分页参数：`?page=1&pageSize=20`，返回 `{ items, total, page, pageSize }`。
- 前端请求封装放 `web/src/services/api/`（沿用现有约定）。

---

## 1. 鉴权 `app/api/auth/*`

### POST `/api/auth/register`
注册。Body：
```json
{ "email": "a@b.com", "username": "nick", "password": "≥8位" }
```
成功 `data`：`{ id, email, username, role, creditBalance }`（已自动登录，下发 Cookie）。
错误：邮箱/用户名已存在（code 1）、密码太弱（code 1）。

### POST `/api/auth/login`
Body：`{ "email", "password" }` → `data`：同上用户对象。失败 code 1「邮箱或密码错误」。限流：同 IP 5 次/分钟。

### POST `/api/auth/logout`
清除会话 Cookie。`data: null`。

### GET `/api/auth/me`
返回当前登录用户（前端用于初始化登录态）。未登录返回 code 401。
`data`：`{ id, email, username, role, creditBalance }`。

---

## 2. 算力点与账本 `app/api/credits/*`

### GET `/api/credits/balance`
`data`：`{ balance: number }`。

### GET `/api/credits/ledger?page=&pageSize=`
`data`：`{ items: Ledger[], total, page, pageSize }`，
`Ledger = { id, delta, balance, reason, refType, refId, remark, createdAt }`。
`reason ∈ redeem|generate|refund|admin_adjust|signup_bonus`。

### POST `/api/credits/redeem`
兑换码充值。Body：`{ "code": "明文兑换码" }`。
成功 `data`：`{ credits: number, balance: number }`。
错误：码无效/已使用/已过期/已禁用（均 code 1，msg 区分）。限流：同用户 10 次/分钟。

---

## 3. AI 生成代理 `app/api/generate/*`（核心）

> 替代现有前端直连。前端把原来发给上游的参数发给这里；服务端鉴权→预扣→代理→落库→结算。

### POST `/api/generate/image`
Body：
```json
{
  "mode": "generation | edit",
  "model": "default::gpt-image-2",
  "prompt": "...",
  "size": "1024x1024 | 9:16 | auto",
  "quality": "1k | 2k | 4k",
  "count": 1,
  "references": ["<assetId 或 dataUrl>"],
  "idempotencyKey": "前端生成的唯一串"
}
```
成功 `data`：
```json
{
  "recordId": "gen_xxx",
  "creditsCost": 12,
  "balance": 88,
  "images": [{ "id": "...", "url": "https://r2.../u/.../0.png" }]
}
```
错误：402 余额不足（前端引导充值）、429 限流、1 上游失败（已自动退点）。

### POST `/api/generate/video`、POST `/api/generate/audio`、POST `/api/generate/text`
结构同上（参数字段对齐现有 config）。`video/audio` 返回 `outputs: [{id,url,mimeType}]`；`text` 走 SSE 流式（见下）。

### 流式（text/问答）
`text` 与画布助手用 **SSE**：`Content-Type: text/event-stream`，事件 `delta`（增量文本）→ `done`（最终 + 本次 `creditsCost`/`balance`）。前端复用现有流式消费逻辑。

### GET `/api/generate/estimate?model=&quality=&count=`
前端发起前预估消耗（生成按钮上展示）。`data`：`{ creditsCost, sizeTier }`。
> 前端也可直接用 `web/src/lib/size-tier.ts` 的 `resolveSizeTierFromInput()` 本地预估，再让后端校准。

---

## 4. 个人中心 `app/api/me/*`

### GET `/api/me/profile` → `{ id, email, username, role, creditBalance, createdAt }`
### GET `/api/me/generations?page=&pageSize=&capability=` → 生成历史
`item = { id, capability, model, prompt, sizeTier, status, creditsCost, outputs:[{url}], createdAt }`
### GET `/api/me/gallery?page=&pageSize=` → 仅 `capability=image && status=success` 的产物聚合

---

## 5. 管理后台 `app/admin-api/*`（需 admin 角色，403 拦截）

### GET `/api/admin/users?page=&pageSize=&keyword=`
`item = { id, email, username, role, status, creditBalance, createdAt }`
### POST `/api/admin/users/:id/ban` body `{ banned: boolean }`
### POST `/api/admin/users/:id/credits` body `{ delta: number, remark }` → 手动调点（落账本 + 审计）
### GET `/api/admin/generations?page=&pageSize=&userId=&status=&model=` → 全站生成记录
### 兑换码
- POST `/api/admin/codes/batch` body `{ credits, count, expiresAt? }` → `data: { batchId, codes: string[] }`（**仅此一次返回明文**，前端导出 CSV）
- GET `/api/admin/codes?batchId=&status=&page=` → 列表（不含明文，只显码后4位/状态/兑换人）
- POST `/api/admin/codes/disable` body `{ batchId }` → 作废批次
### 模型定价
- GET `/api/admin/pricing` → `ModelPricing[]`
- POST `/api/admin/pricing` body `{ channel, model, capability, sizeTier, creditsCost, enabled }`（upsert）
### 渠道
- GET `/api/admin/channels` → `{ id, name, type, baseUrl, weight, enabled }`（**绝不返回 apiKey**）
- POST `/api/admin/channels` body `{ name, type, baseUrl, apiKey, weight, enabled }`（apiKey 后端加密存储）
### 看板
- GET `/api/admin/stats` → `{ dau, newUsers, genCount, genFailRate, creditsConsumed, redeemAmount }`（按日）

---

## 字段枚举速查
- `role`: `user | admin | superadmin`
- `status(user)`: `active | banned`
- `capability`: `image | video | audio | text`
- `sizeTier`: `t1k | t2k | t4k | standard`
- `genStatus`: `pending | success | failed`
- `ledgerReason`: `redeem | generate | refund | admin_adjust | signup_bonus`
- `codeStatus`: `unused | used | disabled`
