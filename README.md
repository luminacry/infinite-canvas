<p align="center">
  <img src="web/public/logo.svg" width="96" alt="infinite-canvas logo">
</p>

<h1 align="center">无限画布 (infinite-canvas) · 商业化增强版</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-f97316?style=flat-square" alt="License"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs" alt="Next.js"></a>
  <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square" alt="shadcn/ui"></a>
</p>

无限画布是一款面向图片创作的开源工作台：把画布编排、AI 图片/视频/音频生成、参考图编辑、对话助手、提示词库和素材沉淀放在同一个界面里。

> 本仓库 fork 自 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)，并在其基础上做了**商业化改造**（平台托管代理 + 算力点计费 + 账号后台）与**全站 UI 重构**（除画布外迁移到 shadcn/ui）。二次开发请保留原作者信息与前端页面标识。

> [!CAUTION]
> 项目处于开发阶段，不保证历史数据兼容。数据库结构与存储格式可能直接调整。合规相关（预付算力点、兑换码、内容审查等）请自行评估，本项目不构成法律意见。

---

## 相对原版改了什么

原版是**纯前端 BYOK**（用户在浏览器里自带 OpenAI 兼容 Key，前端直连上游）。本 fork 把它改造成**平台托管 + 多用户计费**的形态，并统一了 UI。

### 1. 后端与账号体系（全新）
- 新增 **Next.js 服务端**：Prisma + PostgreSQL + Redis。
- **邮箱 + 密码**注册/登录，bcrypt 哈希，DB 会话 + httpOnly Cookie，登录限流，注册赠送算力点。
- 会话缓存（Redis/内存回退），降低每请求 DB 压力。

### 2. AI 能力：平台托管代理 + 算力点计费（核心变化）
- **API Key 的持有方从「用户浏览器」转移到「平台服务端」**：用户不再填 Key。
- 服务端统一代理生图/文本请求，**按模型分辨率档位（1k/2k/4k）或按次扣算力点**。
- 完整生命周期：鉴权 → 归档档位 → 查价 → 事务内预扣 → 代理上游（服务端持 Key）→ 落对象存储 → 结算 / **失败自动退点**；带幂等锁与超时对账兜底。
- **图片、文本分渠道**：各自独立 Key/上游/模型，对用户只显示「渠道1 / 渠道2」，**不暴露上游站点与 Key**。
- 上游 Key 用 **AES-256-GCM 加密**存库。

### 3. 计费与兑换码
- 算力点账本（append-only，事务 + 行锁防并发超扣）。
- **兑换码充值**（站外收款，站内只做「兑换码 → 算力点」）：Redis 锁 + 事务 + 状态条件更新三重防重复兑换。

### 4. 管理后台（全新，RBAC）
- 数据看板、用户管理（封禁/调点）、生成记录、兑换码（批量生成 + CSV 导出）、模型定价、渠道管理、审计日志。

### 5. UI 全站重构
- **除画布外**，登录/注册、个人中心、管理后台、生图/视频/素材/提示词工作台、全局组件全部迁移到 **shadcn/ui**，反馈统一用 sonner toast，跟随明暗主题。
- 画布本身保留 Ant Design（其 message context 与主题依赖较深）。

### 6. 本地开发回退
- 未配对象存储时图片落本机磁盘并通过 `/api/files` 读取；`REDIS_URL=memory` 时用内存限流/锁/缓存。

---

## 技术栈

- **前端**：Next.js 16、React 19、TypeScript、Tailwind CSS v4、shadcn/ui（画布仍用 Ant Design）、Zustand、TanStack Query。
- **后端**：Next.js Route Handlers（长驻 Node 进程）、Prisma、PostgreSQL、Redis。
- **对象存储**：Cloudflare R2（S3 兼容）；本地开发可回退到磁盘。
- **部署**：Docker（推荐，长驻进程支持生视频等长任务）。

> ⚠️ 生成（尤其视频）可能耗时数分钟，**不要用 Serverless/Vercel 跑 AI 代理**，会超时。请用长驻进程（Docker）。

---

## 环境变量

在 `web/` 下创建 `.env`（参考根目录 `.env.example`）：

```env
# PostgreSQL
DATABASE_URL=postgresql://用户:密码@127.0.0.1:5432/infinite_canvas
# Redis（会话/限流/锁/幂等）；本地可用 memory 回退
REDIS_URL=redis://127.0.0.1:6379   # 或 memory

# 会话
SESSION_COOKIE_NAME=ic_session
SESSION_TTL_DAYS=30
SIGNUP_BONUS_CREDITS=100                 # 注册赠送算力点

# 加密上游 AI Key（必填）：openssl rand -hex 32
DATA_ENCRYPTION_KEY=

# Cloudflare R2（不配则回退本机磁盘 + /api/files）
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=infinite-canvas
R2_PUBLIC_BASE=                          # 绑定的公开域；留空用预签名 URL（1 小时过期，生产建议配）

# 对账 cron 内部密钥（可选）
INTERNAL_CRON_KEY=
```

---

## 部署

### 一、准备依赖服务
- **PostgreSQL** 与 **Redis**（自建或托管均可）。
- **Cloudflare R2**（生产必备；本地可先不配，走磁盘回退）。

### 二、初始化数据库
```bash
cd web
npm install                 # 或 bun install
npm run db:generate         # 生成 Prisma Client
npm run db:migrate          # 建表（首次会提示命名 migration）
npm run db:seed             # 种子：管理员 + 示例渠道/定价/兑换码
```
种子会输出默认管理员账号与示例兑换码（见 `web/prisma/seed.ts`），**上线前请改掉默认密码**。

### 三、配置渠道（图片、文本分开）
用脚本把上游渠道与定价写入数据库（Key 会加密入库，不进代码/日志）：
```bash
# 图片渠道1
CH_ID=seed-default CH_NAME=渠道1 CH_CAP=image \
  CH_BASEURL=https://你的图片上游 CH_KEY=sk-xxx CH_MODEL=gpt-image-2 \
  node scripts/configure-channel.mjs

# 文本渠道2
CH_ID=seed-text CH_NAME=渠道2 CH_CAP=text \
  CH_BASEURL=https://你的文本上游 CH_KEY=sk-xxx CH_MODEL=gpt-5.5 \
  CH_TIER=standard CH_COST=1 node scripts/configure-channel.mjs
```
也可在**管理后台 → 渠道管理 / 模型定价**里配置。

### 四、运行

开发（热重载）：
```bash
cd web && npm run dev        # http://localhost:3000
```

生产（长驻进程）：
```bash
cd web
npm run build
# standalone 需要拷贝静态资源
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production node .next/standalone/server.js
```

Docker：
```bash
docker build -t infinite-canvas .
docker run --rm -p 3000:3000 --env-file web/.env infinite-canvas
```

### 五、对账 cron（建议）
定时退回超时未完成的生成预扣点：
```bash
# crontab（每 5 分钟）
*/5 * * * * BASE_URL=https://你的域名 INTERNAL_CRON_KEY=xxx bash /path/to/web/scripts/reconcile-cron.sh
```

---

## 使用流程

1. 打开站点 → 注册（送算力点）→ 登录。
2. 管理员登录后台，配置渠道、模型定价，批量生成兑换码。
3. 普通用户：个人中心用兑换码充值 → 在画布/工作台选模型（只看到「渠道1/渠道2」）生成 → 按档位扣点，失败自动退点，产物进图库。

---

## 开源协议

GNU Affero General Public License v3.0，见 [LICENSE](LICENSE)。原始项目版权归 [basketikun](https://github.com/basketikun/infinite-canvas) 所有。
