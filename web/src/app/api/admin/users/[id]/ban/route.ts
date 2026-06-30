import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { clientIp } from "@/server/request-meta";
import { setBanned } from "@/server/services/admin-service";
import { audit } from "@/server/services/audit-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return handle(async () => {
        const admin = await requireAdmin();
        const { id } = await params;
        const { banned } = await req.json();
        await setBanned(id, Boolean(banned));
        await audit(admin.id, banned ? "ban_user" : "unban_user", id, undefined, clientIp(req));
        return ok(null);
    });
}
