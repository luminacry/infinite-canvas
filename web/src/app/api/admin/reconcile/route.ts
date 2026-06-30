import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { reconcilePending } from "@/server/services/gen-service";

// 兜底对账：退点并失败化超时仍 pending 的生成记录。
// 两种调用方式：管理员会话；或 cron 携带 x-internal-key（匹配 INTERNAL_CRON_KEY 环境变量）。
export async function POST(req: NextRequest) {
    return handle(async () => {
        const internalKey = process.env.INTERNAL_CRON_KEY;
        const provided = req.headers.get("x-internal-key");
        if (!internalKey || provided !== internalKey) await requireAdmin();
        const minutes = Math.max(1, Number(req.nextUrl.searchParams.get("minutes")) || 10);
        const count = await reconcilePending(minutes * 60_000);
        return ok({ reconciled: count });
    });
}
