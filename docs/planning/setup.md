# 本地启动与验证（商业化后端）

## 1. 依赖
```bash
cd web
bun install                 # 装新依赖（Prisma/ioredis/R2 SDK/bcryptjs/zod 等）
```

## 2. 起 Postgres + Redis（任选）
```bash
docker run -d --name ic-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=infinite_canvas -p 5432:5432 postgres:16
docker run -d --name ic-redis -p 6379:6379 redis:7
```

## 3. 配置 .env（在 web/ 下建 .env，参考根目录 .env.example）
```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/infinite_canvas
REDIS_URL=redis://127.0.0.1:6379
DATA_ENCRYPTION_KEY=<openssl rand -hex 32 生成>
SIGNUP_BONUS_CREDITS=100
# R2（不测图片落库可先留空，但生图会在落库步失败）
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=infinite-canvas
R2_PUBLIC_BASE=
# 种子用：上游 OpenAI 兼容渠道
SEED_UPSTREAM_BASEURL=https://your-openai-compatible
SEED_UPSTREAM_KEY=sk-xxx
SEED_UPSTREAM_MODEL=gpt-image-2
```

## 4. 建表 + 生成 Client + 种子
```bash
bun run db:generate         # 生成 Prisma Client（否则 @prisma/client 类型报错）
bun run db:migrate          # 首次建表（交互式命名 migration，如 init）
bun run db:seed             # 管理员 + 渠道 + 定价 + 示例兑换码
```
种子输出：`admin@example.com / admin12345`，兑换码 `DEMO-AAAA-BBBB-CCCC`（1000 点）。

## 5. 启动
```bash
bun run dev                 # http://localhost:3000
```

## 6. 冒烟验证
1. 打开 `/` → 未登录自动跳 `/login`。
2. `/register` 注册 → 自动登录 → 顶栏显示用户名 + 余额（注册送 100 点）。
3. 个人中心 → 兑换充值 → 输入 `DEMO-AAAA-BBBB-CCCC` → 余额 +1000，账本出现一条 `兑换充值`。
4. （需 R2 + 真实上游）调用 `POST /api/generate/image`，body `{"model":"gpt-image-2","prompt":"a cat","quality":"1k","count":1}` → 扣 5 点、返回图片 URL；上游故意填错触发失败 → 自动退点、账本出现 `失败退点`。

## 已知未完成（见报告）
- 画布节点目前仍走旧的浏览器直连（`services/api/image.ts`）。切到代理网关需改 `canvas-node-generation.ts` 等，建议在应用能跑起来后逐步替换并实测。
- video/audio/text 代理、个人中心「生成历史/图库」、管理后台页面尚未实现。
