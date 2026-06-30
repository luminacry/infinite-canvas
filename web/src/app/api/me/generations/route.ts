import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { listGenerations } from "@/server/services/me-service";

export async function GET(req: NextRequest) {
    return handle(async () => {
        const user = await requireUser();
        const sp = req.nextUrl.searchParams;
        const page = Math.max(1, Number(sp.get("page")) || 1);
        const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize")) || 20));
        const capability = sp.get("capability") || undefined;
        return ok(await listGenerations(user.id, page, pageSize, capability));
    });
}
