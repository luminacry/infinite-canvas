# 商业化改造 · 工作日志与交接

> 本文件记录把「无限画布」从纯前端 BYOK 工具改造为「平台托管代理 + 算力点计费」多用户 SaaS 的全过程、已完成项、待办项与本地运行方式，便于后续接手。
> 分支：`feat/commercialization`。最后更新：2026-07-01。
>
> ⚠️ 本文件不含任何密钥/真实 baseUrl，敏感信息仅存于（已 gitignore 的）`web/.env` 与数据库中。

---

## 1. 背景与目标

- 项目原为纯前端、用户自带 OpenAI 兼容 Key（BYOK）的画布工具，v0.4.0 移除了后端。
- 本次目标：**重新长出后端**，做成商业化 SaaS：
  - 用户注册/登录、管理后台、查看用户与生成记录、权限、计费。
  - **AI 能力 = 平台托管代理 + 算力点**：平台持有上游 Key，统一代理生图/文本，按模型档位扣算力点。
  - **付费 = 兑换码**（站外收款，站内只做「兑换码 → 算力点」）。
  - **图片、文本分渠道**：各自独立 Key/上游/模型，对用户只显示「渠道1 / 渠道2」，不暴露站点与 Key。

---

## 2. 关键决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 后端栈 | Next.js 全栈（Node Server 长驻）+ Prisma + PostgreSQL + Redis | 复用现有 Next 前端、一套 TS、现成 Docker 长驻进程适合长任务代理 |
| 对象存储 | Cloudflare R2（S3 兼容）；本地开发回退到磁盘 | 零出口流量费 |
| 登录 | 首发仅邮箱 + 密码；OAuth 延后 | 最小可用 |
| 计费 | 图片按分辨率档 1k/2k/4k；文本按次（standard） | 与现有 quality 体系对齐 |
| 收款 | 兑换码 | 省支付网关与大部分合规 |
| 文本/图片 | **分渠道**（capability 维度解析） | 图片提供商常不支持文本，反之亦然（实测某图片提供商仅支持图片、文本需另一提供商） |

---

## 3. 进度时间线（按对话顺序）

1. 克隆并分析项目（README/架构/canvas-agent/插件）。
2. 产出商业化规划文档，确认 4 项决策（托管代理+算力点、兑换码、规划文档优先、后端栈待定）。
3. 补充决策：R2、仅邮箱密码、按像素档计费。
4. 实现 **M0–M5**（账号/算力点/兑换码/AI图片代理/个人中心/管理后台）。
5. 本地把应用真正跑起来（userland Node 20 + embedded-postgres + 内存 Redis + 本地存储回退），端到端实测通过。
6. 接入真实图片渠道「渠道1」，画布生成接入平台代理（改 `services/api/image.ts` 内部，画布文件零改动）。
7. 修复「画布生成图刷新后空白」（节点 content 改存服务端持久 URL）。
8. 加文本渠道「渠道2」，实现文本流式代理（/chat/completions → 转成前端 SSE 格式）。
9. 去掉 BYOK 配置入口、模型改读 `/api/models`、关闭"请配置渠道"弹窗。
10. 生成后余额实时刷新。
11. 一批优化：生产构建切换、会话缓存、进度反馈、对账 cron。

---

## 4. 已完成（详细）

### 后端（`web/src/server/`、`web/src/app/api/`、`web/prisma/`）
- **数据模型** `prisma/schema.prisma`：User / Session / CreditLedger（append-only 账本）/ RedemptionCode / ModelPricing（按 channel+model+capability+sizeTier）/ GenerationRecord / AiChannel（Key 加密）/ AuditLog。
- **基础设施**：`db.ts`、`redis.ts`（限流/锁/缓存，REDIS_URL=memory 时内存回退）、`r2.ts`（R2 + 本地磁盘回退）、`crypto.ts`（AES-256-GCM 加密上游 Key）、`http.ts`（统一 `{code,data,msg}`）、`errors.ts`（AppError）、`auth.ts`（会话 + RBAC + 60s 会话缓存）。
- **账号** `/api/auth/{register,login,logout,me}`：bcrypt、DB 会话 + httpOnly Cookie、登录/注册限流、注册送点。
- **算力点** `/api/credits/{balance,ledger,redeem}`：账本事务 + 行锁（`SELECT … FOR UPDATE`）防超扣；兑换码 Redis 锁 + 事务 + status 条件更新三重防重复兑换。
- **AI 代理**：
  - `/api/generate/image`：鉴权 → 归档档位 → 查价 → 预扣（事务内建 pending 记录）→ 代理上游（持 Key 出网）→ 落 R2/本地 → 结算/失败退点；幂等锁；支持 generation 与 edit(img2img/蒙版)。
  - `/api/generate/text`：独立按 capability=text 解析渠道；走 `/chat/completions`，把 chat SSE 转成前端已支持的 `response.output_text.delta` 格式；按次扣点。
  - `/api/generate/estimate`：预估消耗（接口就绪，前端展示待接）。
  - `/api/models`：对用户只暴露「渠道+模型+档位价」，**绝不返回 baseUrl/Key**。
- **个人中心** `/api/me/{generations,gallery}`。
- **管理后台** `/api/admin/{users,users/[id]/ban,users/[id]/credits,generations,codes,codes/batch,codes/disable,pricing,channels,stats,reconcile}`：RBAC + 审计日志；渠道接口不回显 Key。
- **超时对账** `reconcilePending` + `/api/admin/reconcile`（支持 `x-internal-key` 给 cron 调用）。

### 前端
- 登录/注册页 `(auth)/`、`AuthGate`（未登录跳转）、`use-auth-store`、顶栏账号菜单（用户名+余额+退出+后台入口）。
- 个人中心 `(user)/account`：余额&账本、生成历史、图库、兑换充值。
- 管理后台 `(admin)/admin/*`：看板、用户、生成记录、兑换码（批量生成+CSV）、定价、渠道。
- 画布接入：`services/api/image.ts` 的 `requestGeneration/requestEdit/requestStreamingResponse` 内部改走平台代理（**画布 3244 行文件零改动**）。
- 平台化：删 BYOK「渠道」Tab、`isAiConfigReady` 只校验选了模型、`usePlatformModels` 从 `/api/models` 填充选择器。
- 体验：生成后余额实时刷新、生成中节点显示已等待秒数。

### 优化
- **生产构建切换**（页面加载 ~70–240ms → 4–7ms）。
- **会话缓存**（requireUser 60s 缓存，登出即失效，封号/改角色 ≤60s 生效）。
- **对账 cron**（`scripts/reconcile-cron.sh` + crontab 示例）。

---

## 5. 本地运行方式（当前环境）

> 本机无 bun/docker/postgres/redis/sudo、Node 仅 18，故全部 userland 绕过：

```bash
# 1. Node 20（已装在 ~/.local/node20）
export PATH=$HOME/.local/node20/bin:$PATH

# 2. 依赖（用 npm 代替 bun）
cd web && npm install --legacy-peer-deps

# 3. 起 embedded-postgres（userland 真 PG，常驻）
node scripts/pg.mjs   # 监听 127.0.0.1:5433，数据在 web/.pgdata

# 4. .env（见 web/.env，关键项）
#    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/infinite_canvas
#    REDIS_URL=memory          # 内存回退，免 Redis
#    DATA_ENCRYPTION_KEY=...    # 必填，用于加密渠道 Key
#    R2_* 留空               # 触发本地磁盘存储 .localstore + /api/files 读取

# 5. 建表 + 种子
npm run db:generate && npm run db:push 2>/dev/null || npx prisma db push
set -a; source .env; set +a && npx tsx prisma/seed.ts

# 6. 配置渠道（脚本读 env，明文不入库）
#    图片渠道1： CH_ID=seed-default CH_NAME=渠道1 CH_CAP=image CH_BASEURL=... CH_KEY=... CH_MODEL=gpt-image-2 node scripts/configure-channel.mjs
#    文本渠道2： CH_ID=seed-text    CH_NAME=渠道2 CH_CAP=text  CH_BASEURL=... CH_KEY=... CH_MODEL=gpt-5.5    CH_TIER=standard CH_COST=1 node scripts/configure-channel.mjs

# 7. 运行
#    开发（热重载，慢）： npm run dev
#    生产（快 20-50×，改代码需重构建）：
npm run build
# 准备 standalone 静态资源
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
# 启动（注意 next start 不兼容 standalone，要用 server.js）
set -a; source .env; set +a; PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production node .next/standalone/server.js
```

**种子账号**：`admin@example.com / admin12345`（superadmin）。**示例兑换码**：`DEMO-DDDD-EEEE-FFFF`（1000 点）。

### 当前运行状态
- **生产模式正在运行**（standalone server.js，端口 3000）。
- 已配渠道：渠道1=图片(gpt-image-2)、渠道2=文本(gpt-5.5)，均实测出图/出文成功、扣费与失败退点正确。

---

## 6. 未完成 / 待办

| 优先级 | 项 | 说明 |
|---|---|---|
| 高 | **video / audio 代理**（M3b 收尾） | 图片、文本已通；视频/音频按同模式补 `/api/generate/{video,audio}` + 渠道 + 前端接入 |
| 高（规模化） | **#6 异步生成队列** | 现在一次生图占住请求 2 分钟，多人并发会占满连接。需「提交即返 jobId → 轮询/SSE 取结果」，改动较大，建议专项 |
| 中 | **#3 预计消耗显示** | `/api/generate/estimate` 已就绪，前端生成按钮未接；属计费透明度 |
| 中 | 邮箱验证 / 找回密码 | 需邮件服务（如 Resend） |
| 中 | 第三方登录（Linux.do/OAuth） | 延后 |
| 上线前 | reconcile 挂真实 cron、监控告警、DB 备份、限流细化、ToS/隐私政策/内容审查、R2_PUBLIC_BASE | 见 commercialization-plan.md 第 10/11 节 |

### 评估后决定「不做」（附理由）
- **#5 去掉图片二次下载**：二次 fetch 基本命中浏览器缓存；blob 被裁剪/编辑/离线流程依赖，移除风险 > 收益。
- **#8 图片流式落 R2**：图片仅 2–3MB，buffer 无压力；流式价值在视频，随 video 链路一起做。

---

## 7. 已知注意事项 / 隐患

1. **生产模式无热重载**：改代码需 `npm run build` 重新构建并重启 standalone。
2. **R2 预签名 1 小时过期**：生产务必配 `R2_PUBLIC_BASE`（公开域），否则持久回退 URL 会失效（本地 blob 仍是主路径）。
3. **会话缓存 60s staleness**：封号/改角色最多 60s 后对在线会话生效（登出立即失效）。
4. **图片 img2img 在某些上游不可用**（如某图片上游的 `/images/edits` 返回 fetch failed）；text2img 正常。需用支持编辑的渠道。
5. **本地存储/数据库为开发态**：`.pgdata`、`.localstore`、`.env`、`package-lock.json` 均已 gitignore，不入库。
6. **AGENTS.md 的「后端规范（Go）」章节是历史遗留**，本次后端是 TypeScript。
7. **法律合规**：预付算力点 + 兑换码在国内涉灰区，上线前请咨询法务（规划文档非法律意见）。

---

## 8. 关键新增文件清单

```
web/prisma/schema.prisma                 数据模型
web/prisma/seed.ts                       种子（管理员/渠道/定价/兑换码）
web/scripts/pg.mjs                       embedded-postgres 启动器（本地）
web/scripts/configure-channel.mjs        配置渠道+定价（读 env，不含密钥）
web/scripts/reconcile-cron.sh            对账 cron
web/src/server/**                        后端：db/redis/r2/crypto/env/http/errors/auth + services/* + ai/*
web/src/app/api/**                       路由：auth/credits/generate/me/admin/models/files
web/src/app/(auth)/**                    登录注册
web/src/app/(admin)/**                   管理后台
web/src/app/(user)/account/**            个人中心
web/src/services/api/{client,auth,credits,me,admin,generate}.ts  前端请求封装
web/src/stores/use-auth-store.ts         登录态
web/src/hooks/use-platform-models.ts     平台模型加载
web/src/lib/size-tier.ts                 分辨率档位（前后端共用）
docs/planning/*.md                       规划/契约/任务/启动/本日志
```

---

## 9. Commit 历史（本次改造）

```
50b4d78 perf: 会话缓存 + 生成进度反馈 + 对账cron
b913b0f feat: 生成后实时同步顶栏算力点余额（无需刷新）
5af5e58 fix: 画布生成图刷新后空白 — 持久化服务端 URL 作为节点内容
188fca2 feat: 平台托管模式 UI — 去掉 BYOK 渠道配置，模型改读 /api/models
2c6dda6 feat: 画布接入平台代理（图片+文本分渠道）+ 本地回退 + 对账兜底
1f77549 feat: 商业化基座 M0-M5（账号/算力点/兑换码/AI代理/后台）
```

相关文档：`commercialization-plan.md`（总规划）、`api-contract.md`（接口契约）、`setup.md`（启动指南）、`codex-tasks.md`（早期前端任务包，现已全部由 Claude 实现）。
