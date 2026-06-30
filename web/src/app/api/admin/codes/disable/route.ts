import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { clientIp } from "@/server/request-meta";
import { disableBatch } from "@/server/services/code-service";
import { audit } from "@/server/services/audit-service";

export async function POST(req: NextRequest) {
    return handle(async () => {
        const admin = await requireAdmin();
        const { batchId } = await req.json();
        if (!batchId) return fail("缺少批次号");
        const count = await disableBatch(batchId);
        await audit(admin.id, "disable_codes", batchId, { count }, clientIp(req));
        return ok({ count });
    });
}
