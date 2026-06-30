import { ok, handle } from "@/server/http";
import { getSessionToken, clearSessionCookie } from "@/server/auth";
import { destroySession } from "@/server/services/auth-service";

export async function POST() {
    return handle(async () => {
        const token = await getSessionToken();
        if (token) await destroySession(token);
        await clearSessionCookie();
        return ok(null);
    });
}
