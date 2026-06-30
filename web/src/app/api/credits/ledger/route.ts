import type { NextRequest } from "next/server";
import { ok, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { listLedger } from "@/server/services/credit-service";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
    return handle(async () => {
        const user = await requireUser();
        const sp = req.nextUrl.searchParams;
        const page = Math.max(1, Number(sp.get("page")) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
        const [items, total] = await Promise.all([listLedger(user.id, page, pageSize), db.creditLedger.count({ where: { userId: user.id } })]);
        return ok({ items, total, page, pageSize });
    });
}
