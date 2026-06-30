#!/usr/bin/env bash
# 兜底对账：退点超时未完成的生成记录。挂系统 cron 周期执行。
# 用法：BASE_URL=https://your-host INTERNAL_CRON_KEY=xxx bash reconcile-cron.sh
# crontab 示例（每 5 分钟）：
#   */5 * * * * BASE_URL=https://your-host INTERNAL_CRON_KEY=xxx bash /path/to/reconcile-cron.sh >> /var/log/ic-reconcile.log 2>&1
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
: "${INTERNAL_CRON_KEY:?need INTERNAL_CRON_KEY}"
curl -fsS -X POST "$BASE_URL/api/admin/reconcile?minutes=10" -H "x-internal-key: $INTERNAL_CRON_KEY"
echo
