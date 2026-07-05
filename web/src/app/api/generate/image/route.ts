import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { rateLimit, acquireLock, releaseLock } from "@/server/redis";
import { enqueueImage } from "@/server/services/gen-service";

export const dynamic = "force-dynamic";

// 提交生图任务：事务内预扣点+建记录+入队，秒回 recordId（不再阻塞等待生成）。
export async function POST(req: NextRequest) {
    return handle(async () => {
        const user = await requireUser();
        if (!(await rateLimit(`gen:${user.id}`, 20, 60))) return fail("生成过于频繁，请稍后再试", 429, 429);

        const body = await req.json();
        const { model, prompt, size, quality, count, mode, references, mask, idempotencyKey } = body ?? {};
        if (!model || !prompt) return fail("缺少模型或提示词");

        // 幂等：短锁防双击重复入队（入队很快，锁 10s 足够）
        const lockKey = idempotencyKey ? `idem:${user.id}:${idempotencyKey}` : "";
        if (lockKey && !(await acquireLock(lockKey, 10_000))) return fail("请求正在处理中，请勿重复提交", 409, 409);
        try {
            const result = await enqueueImage(user.id, { model, prompt, size, quality, count, mode, references, mask });
            return ok(result); // { recordId }
        } finally {
            if (lockKey) await releaseLock(lockKey);
        }
    });
}
