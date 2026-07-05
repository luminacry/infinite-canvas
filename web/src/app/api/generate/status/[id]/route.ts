import { ok, fail, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { getGenerationStatus } from "@/server/services/gen-service";

export const dynamic = "force-dynamic";

// 查询生成任务状态：仅本人可查。返回 { status, progress, images?, error? }。
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    return handle(async () => {
        const user = await requireUser();
        const { id } = await params;
        const state = await getGenerationStatus(id, user.id);
        if (!state) return fail("任务不存在", 404, 404);
        return ok(state);
    });
}
