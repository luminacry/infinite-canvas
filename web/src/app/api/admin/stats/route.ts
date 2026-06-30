import { ok, handle } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { stats } from "@/server/services/admin-service";

export async function GET() {
    return handle(async () => {
        await requireAdmin();
        return ok(await stats());
    });
}
