import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { clientIp } from "@/server/request-meta";
import { listPricing, upsertPricing } from "@/server/services/admin-service";
import { audit } from "@/server/services/audit-service";

export async function GET() {
    return handle(async () => {
        await requireAdmin();
        return ok(await listPricing());
    });
}

export async function POST(req: NextRequest) {
    return handle(async () => {
        const admin = await requireAdmin();
        const body = await req.json();
        const { channel, model, capability, sizeTier, creditsCost, enabled } = body ?? {};
        if (!channel || !model || !capability || !sizeTier) return fail("缺少必填字段");
        const row = await upsertPricing({ channel, model, capability, sizeTier, creditsCost: Number(creditsCost), enabled: enabled !== false });
        await audit(admin.id, "upsert_pricing", `${channel}/${model}/${capability}/${sizeTier}`, { creditsCost }, clientIp(req));
        return ok(row);
    });
}
