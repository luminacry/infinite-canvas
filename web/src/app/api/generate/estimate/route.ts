import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { estimateCost } from "@/server/services/pricing-service";
import { resolveSizeTierFromInput } from "@/lib/size-tier";

export async function GET(req: NextRequest) {
    return handle(async () => {
        await requireUser();
        const sp = req.nextUrl.searchParams;
        const model = sp.get("model");
        const capability = sp.get("capability") || "image";
        if (!model) return fail("缺少模型");
        const count = Math.max(1, Math.min(10, Number(sp.get("count")) || 1));
        const sizeTier = resolveSizeTierFromInput(sp.get("quality") || sp.get("size") || undefined);
        const unit = await estimateCost(model, capability, sizeTier);
        return ok({ sizeTier, unitCost: unit, count, creditsCost: unit === null ? null : unit * count });
    });
}
