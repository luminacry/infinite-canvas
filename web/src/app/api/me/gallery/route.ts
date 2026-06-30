import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { listGallery } from "@/server/services/me-service";

export async function GET(req: NextRequest) {
    return handle(async () => {
        const user = await requireUser();
        const sp = req.nextUrl.searchParams;
        const page = Math.max(1, Number(sp.get("page")) || 1);
        const pageSize = Math.min(60, Math.max(1, Number(sp.get("pageSize")) || 24));
        return ok(await listGallery(user.id, page, pageSize));
    });
}
