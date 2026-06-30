import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { listCodes } from "@/server/services/code-service";

export async function GET(req: NextRequest) {
    return handle(async () => {
        await requireAdmin();
        const sp = req.nextUrl.searchParams;
        const page = Math.max(1, Number(sp.get("page")) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
        return ok(await listCodes(page, pageSize, { batchId: sp.get("batchId") || undefined, status: sp.get("status") || undefined }));
    });
}
