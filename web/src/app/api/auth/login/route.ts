import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { rateLimit } from "@/server/redis";
import { clientIp, userAgent } from "@/server/request-meta";
import { verifyLogin, createSession } from "@/server/services/auth-service";
import { setSessionCookie } from "@/server/auth";

export async function POST(req: NextRequest) {
    return handle(async () => {
        const ip = clientIp(req);
        if (!(await rateLimit(`login:${ip}`, 5, 60))) return fail("登录过于频繁，请稍后再试", 429, 429);

        const { email, password } = await req.json();
        if (!email || !password) return fail("请填写邮箱和密码");

        const user = await verifyLogin(email, password);
        const token = await createSession(user.id, { ip, userAgent: userAgent(req) });
        await setSessionCookie(token);
        return ok(user);
    });
}
