# Codex / GPT-5.5 任务包（前端并行开发）

> 你（Codex）负责**前端页面与请求封装**；另一位 agent（Claude）负责**后端**。
> 两边通过 `docs/planning/api-contract.md` 对接。**严格按下面的文件归属，不要改对方的文件**，否则会合并冲突。

## 开工前必读
1. `docs/planning/api-contract.md` —— 所有接口的请求/响应（你照这个写）。
2. `AGENTS.md` —— 前端规范（必须遵守）：Next.js App Router + React + TS + Ant Design 6 + Tailwind + Zustand；API 请求集中在 `web/src/services/api/`；跨页状态放 `web/src/stores/`；页面文案中文；不层层透传 props；不顺手重构无关文件。
3. 分支：`feat/commercialization`（已创建，在此分支上提交）。

## 文件归属（红线）

### ✅ 你（Codex）拥有，可自由创建/修改：
```
web/src/app/(auth)/login/page.tsx            登录页
web/src/app/(auth)/register/page.tsx         注册页
web/src/app/(user)/account/page.tsx          个人中心（余额/账本/历史/图库 Tab）
web/src/app/(user)/account/components/**      个人中心私有组件
web/src/app/(admin)/**                        管理后台所有页面与私有组件
web/src/services/api/auth.ts                  鉴权请求封装（register/login/logout/me）
web/src/services/api/credits.ts               余额/账本/兑换码 请求封装
web/src/services/api/me.ts                    个人中心请求封装
web/src/services/api/admin.ts                 后台请求封装
web/src/stores/use-auth-store.ts              登录态 store（当前用户、余额）
web/src/hooks/use-require-auth.ts             未登录跳转 hook
```

### ⛔ 不要碰（Claude 的后端，改了会冲突）：
```
web/prisma/**
web/src/server/**
web/src/app/api/**           （后端路由）
web/src/lib/size-tier.ts     （共享逻辑，只读复用，别改）
web/src/services/api/image.ts | video.ts | audio.ts | request.ts  （Claude 改这些切代理）
web/package.json / .env.example  （依赖已加好，别动）
```

### ⚠️ 需协调的共享点
- 登录守卫：现有 `web/src/app/(user)/layout.tsx` 要加「未登录跳 /login + 顶部显示余额」。**这个文件你来加**，但只在顶部接入 `use-auth-store` 和 `use-require-auth`，不要改其中既有画布逻辑。
- 余额展示：画布右上角余额组件你做，数据从 `use-auth-store` 取。

## 任务清单（建议顺序）

### T1. 鉴权 UI（先做，后端 /api/auth/* 同步在建）
- `services/api/auth.ts`：封装 register/login/logout/me，统一 `credentials: "include"`，解析 `{code,data,msg}`，`code!==0` 抛带 msg 的错误。
- `use-auth-store.ts`：`{ user, loading, fetchMe(), login(), register(), logout() }`。
- 登录/注册页：Ant Design Form，中文文案，错误提示用 message。成功后写入 store 并跳首页。
- `use-require-auth.ts`：无 user 时 `router.replace("/login")`。
- 在 `(user)/layout.tsx` 顶部接入：进入时 `fetchMe()`，未登录跳转，显示用户名 + 余额。
- **验收**：能注册→自动登录→刷新保持登录→登出。后端没就绪时，先按契约 mock 一个返回也可联调。

### T2. 个人中心
- `services/api/me.ts` + `credits.ts`。
- `account/page.tsx`：Tabs = 余额&账本 / 生成历史 / 我的图库 / 兑换充值。
  - 余额&账本：余额卡片 + 账本流水表（分页，reason 中文映射）。
  - 兑换充值：输入框 + 兑换按钮，调 `/api/credits/redeem`，成功刷新余额。
  - 生成历史：表格/卡片，展示模型/状态/消耗/时间，点开看产物。
  - 图库：瀑布流/网格展示成功的图片产物。
- **验收**：兑换码充值后余额与账本即时更新。

### T3. 管理后台（admin 角色）
- `(admin)` 路由组 + 后台布局（侧边菜单）。非 admin 进入显示 403。
- 页面：用户管理（搜索/封禁/调点）、生成记录、兑换码（批量生成→导出CSV、批次列表、作废）、模型定价（按 1k/2k/4k 配点数）、渠道管理（**不显示 apiKey**）、数据看板。
- `services/api/admin.ts` 按契约封装。
- **验收**：管理员能发码并导出、调用户算力点、查任意用户生成图。

## 联调约定
- 你写完一个模块，告诉用户「T1 完成，等后端 /api/auth/*」，由用户在两个 agent 间传话；后端就绪后一起冒烟。
- 发现契约缺字段：**先在 `api-contract.md` 提出修改**（标注 TODO + 你的建议），让用户同步给 Claude 确认，再动代码。
- 不确定的交互/样式，遵循现有画布主题与 `AGENTS.md` 画布 UI 规范。
