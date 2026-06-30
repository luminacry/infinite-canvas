import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { reconcilePending } from "@/server/services/gen-service";

// 兜底对账：退点并失败化超时仍 pending 的生成记录。建议用 cron 周期调用（带管理员会话或内部密钥）。
export async function POST(req: NextRequest) {
    return handle(async () => {
        await requireAdmin();
        const minutes = Math.max(1, Number(req.nextUrl.searchParams.get("minutes")) || 10);
        const count = await reconcilePending(minutes * 60_000);
        return ok({ reconciled: count });
    });
}
