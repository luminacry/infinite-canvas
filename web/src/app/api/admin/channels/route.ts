import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { clientIp } from "@/server/request-meta";
import { listChannels, upsertChannel } from "@/server/services/admin-service";
import { audit } from "@/server/services/audit-service";

export async function GET() {
    return handle(async () => {
        await requireAdmin();
        return ok(await listChannels()); // 不含明文 Key
    });
}

export async function POST(req: NextRequest) {
    return handle(async () => {
        const admin = await requireAdmin();
        const body = await req.json();
        const { id, name, type, baseUrl, apiKey, weight, enabled } = body ?? {};
        if (!name || !type || !baseUrl) return fail("缺少渠道名/类型/地址");
        const row = await upsertChannel({ id, name, type, baseUrl, apiKey, weight, enabled });
        await audit(admin.id, id ? "update_channel" : "create_channel", row.id, { name, type }, clientIp(req));
        return ok(row);
    });
}
