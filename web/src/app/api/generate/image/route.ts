import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { rateLimit, acquireLock, releaseLock } from "@/server/redis";
import { generateImage } from "@/server/services/gen-service";

// 生成可能耗时，避免被构建期静态分析；明确动态执行
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    return handle(async () => {
        const user = await requireUser();
        if (!(await rateLimit(`gen:${user.id}`, 20, 60))) return fail("生成过于频繁，请稍后再试", 429, 429);

        const body = await req.json();
        const { model, prompt, size, quality, count, mode, references, mask, idempotencyKey } = body ?? {};
        if (!model || !prompt) return fail("缺少模型或提示词");

        // 幂等：同一 key 在处理期间加锁，防双击/重试导致重复扣费
        const lockKey = idempotencyKey ? `idem:${user.id}:${idempotencyKey}` : "";
        if (lockKey && !(await acquireLock(lockKey, 300_000))) return fail("请求正在处理中，请勿重复提交", 409, 409);
        try {
            const result = await generateImage(user.id, { model, prompt, size, quality, count, mode, references, mask });
            return ok(result);
        } finally {
            if (lockKey) await releaseLock(lockKey);
        }
    });
}
