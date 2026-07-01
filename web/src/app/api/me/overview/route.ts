import { ok, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { getOverview } from "@/server/services/me-service";

export async function GET() {
    return handle(async () => {
        const user = await requireUser();
        return ok(await getOverview(user.id));
    });
}
