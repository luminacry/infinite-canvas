import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { clientIp } from "@/server/request-meta";
import { adjustCredits } from "@/server/services/admin-service";
import { audit } from "@/server/services/audit-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return handle(async () => {
        const admin = await requireAdmin();
        const { id } = await params;
        const { delta, remark } = await req.json();
        if (typeof delta !== "number") return fail("delta 必须是数字");
        const balance = await adjustCredits(id, delta, remark || "管理员调整");
        await audit(admin.id, "adjust_credits", id, { delta, remark }, clientIp(req));
        return ok({ balance });
    });
}
