import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/redis";
import { redeem } from "@/server/services/code-service";

export async function POST(req: NextRequest) {
    return handle(async () => {
        const user = await requireUser();
        if (!(await rateLimit(`redeem:${user.id}`, 10, 60))) return fail("兑换过于频繁，请稍后再试", 429, 429);

        const { code } = await req.json();
        if (!code || typeof code !== "string") return fail("请输入兑换码");

        const result = await redeem(user.id, code);
        return ok(result);
    });
}
