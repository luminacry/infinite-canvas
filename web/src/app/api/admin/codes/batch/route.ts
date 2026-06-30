import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { clientIp } from "@/server/request-meta";
import { generateBatch } from "@/server/services/code-service";
import { audit } from "@/server/services/audit-service";

export async function POST(req: NextRequest) {
    return handle(async () => {
        const admin = await requireAdmin();
        const { credits, count, expiresAt } = await req.json();
        if (!credits || !count) return fail("请填写面值与数量");
        const result = await generateBatch(Number(credits), Number(count), expiresAt ? new Date(expiresAt) : undefined);
        await audit(admin.id, "gen_codes", result.batchId, { credits, count }, clientIp(req));
        return ok(result); // codes 明文仅此一次返回
    });
}
