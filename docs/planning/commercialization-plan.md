# 无限画布 · 商业化改造规划

> 版本：v1（规划阶段）｜目标：把项目从「纯前端 BYOK 个人工具」改造为「平台托管代理 + 算力点计费」的多用户商业 SaaS
> 已确定的核心决策：
> - **AI 能力**：平台托管上游 Key，统一代理生图/生视频/生音频，按模型扣**算力点（credits）**
> - **付费**：**兑换码充值**（站外收款，站内只做「兑换码 → 算力点」），暂不接入支付网关
> - **后端栈**：Next.js 全栈（Node Server 长驻模式）+ Prisma + PostgreSQL + Redis
> - **对象存储**：**Cloudflare R2**（S3 兼容，零出口流量费）
> - **登录方式**：**首发仅邮箱 + 密码**；Linux.do / 第三方 OAuth 延后，暂不实现
> - **计费方式**：图片**按分辨率档位计费（1k / 2k / 4k）**，每档单独定价
> - **本次交付**：完整规划文档（本文件），评审通过后再分阶段实现

---

## 0. 一句话总览

在不破坏现有画布前端体验的前提下，新增「账号体系 + 算力点账本 + 兑换码 + AI 托管代理与计量 + 管理后台」五大支柱，并补齐一个商业项目必备的工程与合规底座。

关键架构变化：**API Key 的持有方从「用户浏览器」转移到「平台服务端」**。这是整个商业化的技术地基，也是最大的隐患来源（见第 9 节）。

---

## 1. 现状与差距（Gap 分析）

| 维度 | 现状（v0.4.0） | 商业化目标 | 差距 |
|------|----------------|-----------|------|
| 用户 | 无账号，纯本地 | 注册/登录/会话 | 全新 |
| API Key | 浏览器直连，用户自带 | 平台托管，服务端代理 | 架构反转 |
| 计费 | 无 | 算力点账本 + 兑换码 | 全新 |
| 数据存储 | 浏览器 localforage/IndexedDB | 服务端 DB + 对象存储 | 需迁移生成记录与图片 |
| 后端 | 仅 2 个 Route（prompts/webdav 代理） | 完整后端分层 | 全新 |
| 管理 | 无 | 管理后台 + RBAC | 全新（v0.0.8 有过，可参考 git 历史） |
| 生成记录 | 存浏览器 | 服务端落库 + 可审计 | 全新 |

> 提示：`AGENTS.md` 仍保留「后端规范」章节（Go 时代遗留），`git log` 里 v0.0.8 实现过账号 + 算力点 + Linux.do OAuth，**业务规则可参考，代码栈这次换成 TypeScript**。

---

## 2. 目标架构

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器（现有画布前端，React 19 + Zustand）                      │
│   - 不再持有上游 API Key                                         │
│   - 携带会话 Cookie 调用「自家后端」                              │
└───────────────┬──────────────────────────────────────────────┘
                │ (same-origin, httpOnly cookie)
┌───────────────▼──────────────────────────────────────────────┐
│  Next.js 后端（Node Server，长驻进程，Docker 部署）              │
│                                                               │
│  app/api/auth/*        注册/登录/会话/登出                       │
│  app/api/credits/*     余额/账本/兑换码兑换                       │
│  app/api/generate/*    ★AI 代理网关（鉴权→预扣→代理→结算→落库）   │
│  app/api/me/*          个人资料/生成历史/图库                    │
│  app/admin-api/*       管理后台接口（RBAC 保护）                  │
│                                                               │
│  server/services/      业务逻辑（事务、计费、限流）               │
│  server/repositories/  Prisma 数据访问                          │
│  server/ai/            上游渠道适配（OpenAI/Gemini/火山方舟）     │
└──────┬──────────────┬───────────────┬────────────────────────┘
       │              │               │
┌──────▼─────┐ ┌──────▼──────┐ ┌──────▼───────────────────┐
│ PostgreSQL │ │   Redis     │ │ 对象存储 (S3/R2/MinIO)     │
│ 账号/账本/  │ │ 会话/限流/   │ │ 生成图片/视频/音频          │
│ 兑换码/记录 │ │ 幂等/锁     │ │                          │
└────────────┘ └─────────────┘ └──────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│ 上游 AI 渠道（平台持有 Key，服务端出网）                         │
│  OpenAI 兼容 / Gemini / 火山方舟 Seedance ...                  │
└──────────────────────────────────────────────────────────────┘
```

**伸缩切口（预留，不现在做）**：当代理流量变大，把 `app/api/generate/*` + `server/ai/` 抽成独立「AI 网关服务」（Go 或 Node），主站只保留账号/账本/后台。现在用模块边界把它隔离干净即可。

---

## 3. 数据模型（PostgreSQL / Prisma schema 草案）

> 遵循 `AGENTS.md`：项目未上线、不兼容旧数据，可直接按新设计建表。金额/点数一律用整数（最小单位），**禁止用浮点存算力点**。

```prisma
// 用户（首发仅邮箱 + 密码登录）
model User {
  id           String   @id @default(cuid())
  email        String   @unique          // 登录账号
  username     String   @unique
  passwordHash String                    // argon2/bcrypt，必填
  status       UserStatus @default(active) // active / banned
  role         Role     @default(user)     // user / admin / superadmin
  creditBalance Int     @default(0)         // 冗余余额，真值以账本汇总为准
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum UserStatus { active banned }
enum Role { user admin superadmin }

// 注：Linux.do / 第三方 OAuth 延后，本期不建 OAuthAccount 表。
//     需要时再加（遵循 AGENTS.md：只实现当前明确需要的功能）。

// 会话（也可放 Redis；DB 表便于后台「踢下线」）
model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  userAgent String?
  ip        String?
  createdAt DateTime @default(now())
}

// ★算力点账本（不可变，append-only，所有增减都记一笔）
model CreditLedger {
  id        String   @id @default(cuid())
  userId    String
  delta     Int                          // 正=充值/退点，负=消费
  balance   Int                          // 本次操作后的余额快照
  reason    LedgerReason                 // redeem / generate / refund / admin_adjust / signup_bonus
  refType   String?                      // 关联实体类型
  refId     String?                      // 关联实体 id（如 GenerationRecord.id）
  remark    String?
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}

enum LedgerReason { redeem generate refund admin_adjust signup_bonus }

// 兑换码
model RedemptionCode {
  id         String   @id @default(cuid())
  code       String   @unique            // 存哈希更安全，见第 7 节
  credits    Int                          // 兑换可得算力点
  batchId    String?                      // 批次管理
  status     CodeStatus @default(unused)  // unused / used / disabled
  usedBy     String?
  usedAt     DateTime?
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
  @@index([batchId])
}

enum CodeStatus { unused used disabled }

// 模型计价表（后台可配，按分辨率档位计费）
model ModelPricing {
  id          String  @id @default(cuid())
  channel     String                      // openai / gemini / volcengine
  model       String                      // 模型名
  capability  String                      // image / video / audio / text
  sizeTier    SizeTier                    // 图片: t1k/t2k/t4k；视频/音频/文本: standard
  creditsCost Int                         // 该档位单次消耗（整数算力点）
  enabled     Boolean @default(true)
  @@unique([channel, model, capability, sizeTier])
}

// 分辨率档位：图片按「长边或总像素」归档
//   t1k ≤ ~1024 边长（≈1MP），t2k ≤ ~2048（≈4MP），t4k ≤ ~4096（≈16MP）
// standard 给视频/音频/文本占位（后续视频可扩展为按时长×分辨率）
enum SizeTier { t1k t2k t4k standard }

// 生成记录（落库 + 可审计 + 用户图库来源）
model GenerationRecord {
  id          String   @id @default(cuid())
  userId      String
  channel     String
  model       String
  capability  String                      // image/video/audio/text
  prompt      String
  params      Json                        // size/quality/seconds...
  status      GenStatus @default(pending) // pending/success/failed
  creditsHeld Int       @default(0)        // 预扣点数
  creditsCost Int       @default(0)        // 实际结算点数
  outputs     Json?                        // 对象存储 key 列表
  errorMsg    String?
  upstreamId  String?                      // 上游请求 id，便于排障
  createdAt   DateTime @default(now())
  @@index([userId, createdAt])
  @@index([status])
}

enum GenStatus { pending success failed }

// 上游渠道与平台 Key（后台配置，Key 加密存储）
model AiChannel {
  id          String  @id @default(cuid())
  name        String
  type        String                       // openai / gemini / volcengine
  baseUrl     String
  apiKeyEnc   String                       // 加密后的 Key，禁止明文
  weight      Int     @default(1)          // 多 Key 负载/容灾
  enabled     Boolean @default(true)
}

// 审计日志（后台敏感操作留痕）
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String                         // 操作者
  action    String                         // ban_user / adjust_credits / gen_codes ...
  target    String?
  detail    Json?
  ip        String?
  createdAt DateTime @default(now())
  @@index([actorId, createdAt])
}
```

**账本设计要点**：`User.creditBalance` 只是缓存，**真值永远等于 `CreditLedger` 当前用户最新一行的 `balance`**。所有扣费/充值都在一个 DB 事务里：写一条 ledger + 更新 `creditBalance`，靠这个保证一致性与可审计。

---

## 4. 功能模块拆解

### 4.1 账号体系（auth）
- 注册：用户名 + 邮箱 + 密码（`argon2`/`bcrypt` 哈希）。**首发只做邮箱密码**，Linux.do / 第三方 OAuth 延后。
- 登录：邮箱 + 密码；签发 **httpOnly + Secure + SameSite** 会话 Cookie（不要把 token 放 localStorage）。
- 邮箱可选做验证（注册发验证邮件）；本期可先不强制，但要预留字段/开关。
- 会话：服务端会话表 / Redis；支持「查看登录设备」「强制下线」。
- 安全：登录限流、密码强度校验、注册图形/行为验证码（防批量薅免费额度）。
- 赠送：新用户注册送 N 点（`signup_bonus`），用于体验。

### 4.2 算力点与账本（credits）
- 余额查询、账本流水分页。
- **统一扣费入口**：`creditService.charge(userId, cost, {reason, refId})`，内部开事务，余额不足直接拒绝。
- **退点**：生成失败自动 `refund`，把预扣点还回。

### 4.3 兑换码（redemption）
- 用户侧：输入码 → 校验（未用/未禁用/未过期）→ 事务内标记 `used` + 写 `redeem` 账本 + 加余额。**必须防并发重复兑换**（行级锁 / 唯一约束 / Redis 锁）。
- 后台侧：按批次生成兑换码（指定面值、数量、有效期），导出 CSV，支持作废批次、查兑换情况。

### 4.4 ★AI 托管代理与计量（generate）——最核心、最危险
完整链路（一条请求的生命周期）：
1. **鉴权**：校验会话，取 `userId`。
2. **限流 + 幂等**：Redis 按用户/IP 限流；用 `Idempotency-Key` 防重复提交重复扣费。
3. **定价**：先把请求尺寸归档为 `SizeTier`——按长边或总像素映射到 `t1k/t2k/t4k`（如 `1024x1024→t1k`、`2048x2048→t2k`、`4096x...→t4k`，介于两档之间向上取档）；再查 `ModelPricing(channel, model, capability, sizeTier)` 得到本次 `creditsCost`。归档函数 `resolveSizeTier(width,height)` 放 `server/services`，前端**预估消耗**也复用同一函数保持一致。
4. **预扣**：事务内扣点并写 `GenerationRecord(status=pending, creditsHeld)`。余额不足直接 402。
5. **代理上游**：从 `AiChannel` 取平台 Key（解密），按渠道适配器请求；**流式透传**给前端，但**剥离上游 Key 与敏感头**。
6. **落库产物**：成功则把图片/视频上传对象存储，记 `outputs`，`status=success`。
7. **结算**：成功按实际结算；失败 `refund` 退点，`status=failed`，记 `errorMsg`。
8. **审计**：保留 `upstreamId` 便于和上游对账、排查超时。

> 现有前端 `web/src/services/api/{image,video,audio}.ts` 当前直连上游，需要**改为调用自家 `/api/generate/*`**，并删除前端持有 Key 的逻辑（保留 BYOK 作为可选开关亦可，但商业模式下默认走平台代理）。

### 4.5 个人中心（me）
- 资料、余额、账本、**我的生成历史**、**我的图库**（来自 `GenerationRecord.outputs`）。
- 把现有「我的素材/生成记录」从 localforage 迁移为服务端数据源（保留本地缓存做体验优化）。

### 4.6 管理后台（admin）
- **RBAC**：`user / admin / superadmin`，接口与页面双重校验，敏感操作写 `AuditLog`。
- 用户管理：列表/搜索、查看详情、封禁/解封、手动调整算力点（带原因，落账本）。
- 生成记录：全站生成查询、按用户/模型/状态筛选、查看生成图片（含违规内容排查）。
- 兑换码：批量生成、批次管理、兑换统计。
- 模型定价：按 `(渠道, 模型, 能力, 分辨率档 1k/2k/4k)` 配置算力点消耗、上下架。
- 渠道管理：配置上游 Key（加密）、权重、启停。
- 数据看板：日活、生成量、消耗点数、兑换额、失败率。

---

## 5. 分阶段实施路线（里程碑）

> 每个阶段都有「可演示 + 可验收」的产物。建议每阶段独立分支 + PR + 评审。

### M0 · 地基（1 周）
- 引入 Prisma + PostgreSQL + Redis，建好上述 schema 与迁移。
- 后端分层骨架：`server/services`、`server/repositories`、`app/api/*` 约定。
- 统一响应结构（沿用历史 `{ code, data, msg }` 约定）、错误处理、日志中间件。
- **产物**：能连库、能跑迁移、有一个 `/api/health`。

### M1 · 账号体系（1 周）
- 注册/登录/登出/会话、密码哈希、登录限流、注册送点。
- 前端登录注册页 + 路由守卫（未登录跳登录）。
- **产物**：可注册登录，余额显示 0 + 赠送点。

### M2 · 算力点 + 兑换码（1 周）
- 账本服务、余额/流水接口与页面。
- 兑换码兑换（防并发）+ 后台批量生成。
- **产物**：用兑换码充值，余额与流水正确。

### M3 · ★AI 托管代理与计量（1.5–2 周，最重）
- 渠道适配器（先 OpenAI 兼容，再 Gemini、火山方舟）。
- 预扣 → 代理（流式）→ 结算/退点 → 落对象存储 → 落库。
- 前端生成链路切到自家代理，删除前端 Key 直连。
- 幂等、限流、并发扣费正确性。
- **产物**：登录用户用算力点完成一次生图，失败自动退点，图片进图库。

### M4 · 个人中心 + 图库迁移（1 周）
- 生成历史、图库、资料页；localforage → 服务端数据源。
- **产物**：用户能在多端看到自己的历史与图片。

### M5 · 管理后台 + RBAC + 审计（1.5 周）
- 用户/记录/兑换码/定价/渠道/看板 + 审计日志。
- **产物**：管理员可运营全站。

### M6 · 商业底座与上线（1 周，见第 8、10 节）
- 监控、备份、限流、条款、隐私政策、内容合规、压测、灰度。
- **产物**：可对外开放的生产环境。

> 总量级约 7–9 周（单人/小团队）。M3 是风险集中点，预算要留足。

---

## 6. 与现有代码的衔接（落地到具体路径）

```
web/src/
  app/api/auth/route.ts           注册/登录/登出/会话
  app/api/credits/route.ts        余额/账本
  app/api/credits/redeem/route.ts 兑换码兑换
  app/api/generate/route.ts       ★AI 代理网关
  app/api/me/...                  个人中心数据
  app/admin-api/...               后台接口（RBAC 中间件）
  app/(user)/login, /register     登录注册页
  app/(admin)/...                 管理后台路由组（新增）
  server/
    services/                     creditService / authService / genService / codeService
    repositories/                 Prisma 访问
    ai/                           渠道适配器（openai/gemini/volcengine）
    middleware/                   auth、rbac、ratelimit、idempotency
    db.ts                         Prisma client 单例
prisma/schema.prisma              数据模型
```

需要修改的现有文件：
- `web/src/services/api/{image,video,audio,request}.ts`：改为打自家 `/api/generate/*`，去掉前端持 Key。
- `web/src/stores/use-config-store.ts`：默认不再要求用户填 Key（保留 BYOK 作为高级可选项）。
- `web/src/app/(user)/layout.tsx`：加登录态守卫、余额展示。
- 现有「我的素材/生成记录」相关 store：改为服务端为主、本地为缓存。

> 遵循 `AGENTS.md`：API 请求集中在 `services/api/`，跨页状态放 `stores/`，不顺手重构无关文件，中文文案。

---

## 7. 关键实现要点（安全与正确性）

1. **上游 Key 托管**：DB 里**加密存储**（如 AES-GCM，密钥放环境变量/KMS），运行时解密；代理时**绝不把上游 Key 透传给浏览器**，响应里剥离 `Authorization` 等敏感头。这是商业化第一红线。
2. **扣费原子性**：预扣/结算/退点全部在 **DB 事务** 内完成，余额检查用 `SELECT ... FOR UPDATE` 或乐观锁，杜绝并发超扣（同一用户并发发起多次生成）。
3. **幂等**：生成接口要求 `Idempotency-Key`，Redis 记录，重复提交返回首次结果，避免「网络重试 = 重复扣费」。
4. **失败必退点**：上游超时/报错/内容被拒，一律退回预扣点并记 `failed`；要有兜底任务扫描「pending 超时」记录做对账。
5. **兑换码安全**：码用足够熵（如 16+ 位随机），DB **存哈希**比对；兑换走唯一约束 + 锁防并发；限制单 IP/账号兑换频率防撞库。
6. **限流与防滥用**：注册、登录、兑换、生成都要限流；新用户赠送点要配验证码，防脚本批量注册薅免费额度。
7. **内容合规**：生成的 prompt 与产物要可被后台审查；保留违规处置（封号、删图、留证）能力。
8. **对象存储（Cloudflare R2）**：图片/视频不要存 DB；用 **R2**（S3 兼容，零出口流量费，适合图片/视频外发场景），DB 只存 object key；用 `@aws-sdk/client-s3` 指向 R2 endpoint。读取走**预签名临时 URL**或绑定自定义域 + Cloudflare 访问控制，**不要公开整个桶**。按用户 id 前缀分目录（`u/{userId}/{recordId}/...`）便于配额统计与封号清理。

---

## 8. 复检 / QA 方案

### 8.1 自动化测试（最低要求）
- **单元测试**：`creditService`（扣费/退点/余额边界）、`codeService`（兑换并发）、定价计算、渠道适配器解析。框架建议 `vitest`。
- **集成测试**：auth 全流程、兑换码兑换、生成链路（mock 上游）端到端扣费正确。
- **并发测试**：对「同用户并发生成」「同码并发兑换」专门写竞态测试，断言**绝不超扣、绝不重复兑换**。
- **金额一致性校验脚本**：定期跑「账本汇总 == creditBalance」对账，任何不一致报警。

### 8.2 评审清单（每个 PR 必过）
- [ ] 涉及算力点的改动是否在事务内、是否有并发测试？
- [ ] 是否有未鉴权 / 未做 RBAC 的接口暴露？
- [ ] 上游 Key、密码、token 是否可能进入日志 / 响应 / 前端？
- [ ] 失败路径是否退点、是否落 `failed`？
- [ ] 后台敏感操作是否写 `AuditLog`？
- [ ] 是否符合 `AGENTS.md`（分层、最少行数、中文文案、不顺手重构）？

### 8.3 安全自检
- 用仓库已有的 `/security-review` 流程过一遍 auth、generate、admin。
- 重点扫：越权（IDOR，能否查别人的生成记录/图库）、SQL/NoSQL 注入、SSRF（代理 baseUrl 可被用户控制时）、敏感信息泄漏。

### 8.4 验收标准（示例）
- 新用户注册→登录→兑换码充值→生图→图入图库，全链路通过。
- 余额不足时拒绝生成并返回明确文案。
- 生成失败自动退点，账本对账一致。
- 管理员能封号、调点（留痕）、查任意用户生成图、批量发码。
- 普通用户访问后台接口被拒。

---

## 9. 交付方案

- **CI/CD**：GitHub Actions（仓库已有 `.github/`）。流水线：lint/类型检查 → 测试 → 构建镜像 → 迁移 → 部署。
- **配置**：`.env`（DB / Redis / R2 端点与密钥 / 数据加密密钥 / 上游 AI Key），区分 dev/prod；密钥进 Secrets，不进仓库。现有 `.env.example` 需补全新增项（`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_BASE` 等）。
- **数据库迁移**：Prisma Migrate，发布前自动执行；上线前在预发环境验证。
- **部署形态**：现有 Docker（`node server.js` 长驻）即可承载代理；DB/Redis/对象存储用托管服务或自建。**不要用 Vercel Serverless 跑生视频代理**（超时）。
- **可观测性**：结构化日志、请求追踪 ID、错误上报（Sentry）、关键指标（生成成功率、上游延迟、扣费失败、余额对账差）。
- **备份**：PostgreSQL 定时备份 + 演练恢复；对象存储开版本/生命周期。
- **回滚**：镜像可回滚；迁移尽量向前兼容，破坏性迁移分两步发布。
- **灰度**：先小范围邀请码内测，再开放注册。

---

## 10. 开发隐患与风险（重点看这节）

| 风险 | 说明 | 对策 |
|------|------|------|
| **并发超扣** | 同用户并发生成导致余额变负 | 事务 + 行锁/乐观锁 + 并发测试，余额加 `>= cost` 校验 |
| **重复扣费** | 网络重试/双击导致多扣 | `Idempotency-Key` + Redis 去重 |
| **失败不退点** | 上游超时却扣了点，用户投诉 | 失败必退 + pending 超时对账兜底任务 |
| **上游 Key 泄漏** | Key 进日志/响应/前端 = 直接被盗刷 | 加密存储、响应剥离、日志脱敏、Key 轮换 |
| **代理超时** | 生视频几分钟，Serverless/网关超时 | 长驻 Node 进程、合理 timeout、异步任务化（可选） |
| **SSRF** | 若 baseUrl 可被用户控制，代理可打内网 | 渠道 baseUrl 仅后台可配，白名单校验 |
| **越权 IDOR** | 用户传别人 id 查记录/图库 | 一律以会话 `userId` 为准，禁止信任前端传入 id |
| **薅免费额度** | 脚本批量注册领赠送点 | 验证码、设备/IP 限制、风控 |
| **兑换码被刷/泄漏** | 码弱、可枚举、并发兑换 | 高熵码、存哈希、兑换限流、唯一约束 |
| **数据迁移丢失** | 用户原本存浏览器的画布/图片 | 提供「导入本地数据到账号」迁移工具，过渡期双写 |
| **画布前端假设单机** | 现有大量状态在浏览器本地 | 渐进式：生成记录/图库先上云，画布工程后跟 |
| **合规（重点）** | 预付算力点 + 兑换码在国内涉「预付/虚拟商品」灰区；用户内容与隐私 | 明确条款、发票/退款政策、内容审查、咨询法务（**本规划非法律意见**） |
| **成本失控** | 上游按量计费，恶意大量生成烧钱 | 定价留毛利、单用户速率/日额上限、异常用量告警与熔断 |

---

## 11. 商业项目「必备清单」（容易被忽略，但上线前要有）

**工程层**
- [ ] 监控告警（错误率、延迟、余额对账、上游失败、成本）
- [ ] 结构化日志 + 追踪 ID + 敏感信息脱敏
- [ ] 数据库备份与恢复演练
- [ ] 限流 / 熔断 / 防滥用（注册、登录、生成、兑换）
- [ ] 幂等与事务一致性（计费核心）
- [ ] 健康检查 / 优雅停机 / 滚动发布与回滚
- [ ] Secrets 管理（不进仓库）

**产品层**
- [ ] 余额不足、生成失败、被封号等**清晰用户文案**
- [ ] 个人中心：账本流水透明可查（计费纠纷靠它）
- [ ] 兑换/客服入口、问题反馈渠道
- [ ] 邮件/站内通知（注册、低余额、兑换成功）

**合规与法务层**（强烈建议，非法律意见，必要时咨询专业人士）
- [ ] 服务条款 ToS、隐私政策（数据如何用、是否用于训练）
- [ ] 退款/兑换政策（虚拟商品是否可退、有效期）
- [ ] 内容合规：生成内容审查、违规处置、举报通道
- [ ] 实名/年龄/未成年人保护（视市场）
- [ ] 国内：ICP 备案、可能的网络安全/算法相关备案
- [ ] 发票与对账能力（即便走兑换码，收款方仍需开票/记账）
- [ ] 数据安全：用户数据加密、最小权限、留痕审计

**运营层**
- [ ] 数据看板（DAU、生成量、消耗、兑换额、毛利、失败率）
- [ ] 兑换码批次与销售渠道对账
- [ ] 客服/工单、风控处置 SOP

---

## 12. 立即下一步（建议执行顺序）

已确定（本轮）：
- **对象存储 = Cloudflare R2**（S3 兼容，零出口流量费）。
- **登录 = 仅邮箱 + 密码**，Linux.do / OAuth 延后。
- **图片计费 = 按分辨率档位 1k / 2k / 4k**，每档单独定价。

仍需确认：
- 视频/音频/文本计费口径（视频是否后续按「时长 × 分辨率」细分？本期先 `standard` 单价占位）。
- 各档位与各模型的**初始定价数值**（毛利模型，可后台改，先给一版默认）。
- 是否需要邮箱验证 / 找回密码邮件（涉及邮件服务选型，如 Resend）。

下一步：评审通过后从 **M0 地基** 开工——接 Prisma + Postgres + Redis + R2，建上述 schema 与迁移，搭后端分层骨架与统一响应/鉴权中间件，并实现 `resolveSizeTier()` 与定价查询。

---

> 本文件为规划草案，落地实现前请先评审。涉及法律/合规内容仅为提醒，非专业法律意见。
