# 构建 Next.js 前端产物。
FROM oven/bun:1.3.13 AS web-build

WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --cache-dir=/root/.bun/install/cache
COPY VERSION /app/VERSION
COPY CHANGELOG.md /app/CHANGELOG.md
COPY web ./
RUN bun run build

# 运行镜像：同时启动 Next.js 主站与生成 worker（共享 Redis + PostgreSQL）。
FROM node:22-bookworm-slim

WORKDIR /app
COPY VERSION /app/VERSION
COPY CHANGELOG.md /app/CHANGELOG.md
# 主站 standalone 产物
COPY --from=web-build /app/web/public /app/web/public
COPY --from=web-build /app/web/.next/standalone /app/web
COPY --from=web-build /app/web/.next/static /app/web/.next/static
# worker 运行所需：源码、prisma、以及 bullmq/tsx/ioredis 等依赖（standalone 未打包）
COPY --from=web-build /app/web/worker /app/web/worker
COPY --from=web-build /app/web/prisma /app/web/prisma
COPY --from=web-build /app/web/tsconfig.json /app/web/tsconfig.json
COPY --from=web-build /app/web/node_modules /app/web/node_modules
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV WORKER_CONCURRENCY=8
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
# 默认同容器起 web + worker；如需拆分可用 RUN_MODE=web / RUN_MODE=worker 只起其一
CMD ["/app/docker-entrypoint.sh"]
