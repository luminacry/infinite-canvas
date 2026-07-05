#!/bin/sh
# 启动 Next.js 主站与/或生成 worker。
# RUN_MODE: both(默认) | web | worker —— 拆分容器时分别设为 web / worker。
set -e
MODE="${RUN_MODE:-both}"
cd /app/web

start_web() {
  echo "[entrypoint] 启动 web (PORT=${PORT:-3000})"
  PORT="${PORT:-3000}" node server.js
}

start_worker() {
  echo "[entrypoint] 启动 worker (WORKER_CONCURRENCY=${WORKER_CONCURRENCY:-8})"
  node node_modules/tsx/dist/cli.mjs --conditions=react-server worker/index.ts
}

case "$MODE" in
  web)    start_web ;;
  worker) start_worker ;;
  both)
    start_worker &
    WORKER_PID=$!
    start_web &
    WEB_PID=$!
    # 任一进程退出即整体退出（便于容器编排重启）
    wait -n "$WORKER_PID" "$WEB_PID"
    exit $?
    ;;
  *) echo "[entrypoint] 未知 RUN_MODE=$MODE"; exit 1 ;;
esac
