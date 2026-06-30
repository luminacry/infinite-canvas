import { ok, errUnauthorized, handle } from "@/server/http";
import { getCurrentUser } from "@/server/auth";
import { toPublicUser } from "@/server/services/auth-service";

export async function GET() {
    return handle(async () => {
        const user = await getCurrentUser();
        if (!user) return errUnauthorized();
        return ok(toPublicUser(user));
    });
}
