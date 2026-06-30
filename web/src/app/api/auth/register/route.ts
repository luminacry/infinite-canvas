import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/server/http";
import { rateLimit } from "@/server/redis";
import { clientIp, userAgent } from "@/server/request-meta";
import { registerUser, createSession } from "@/server/services/auth-service";
import { setSessionCookie } from "@/server/auth";

export async function POST(req: NextRequest) {
    return handle(async () => {
        const ip = clientIp(req);
        if (!(await rateLimit(`register:${ip}`, 10, 600))) return fail("注册过于频繁，请稍后再试", 429, 429);

        const { email, username, password } = await req.json();
        if (!email || !username || !password) return fail("请填写邮箱、用户名和密码");

        const user = await registerUser(email, username, password);
        const token = await createSession(user.id, { ip, userAgent: userAgent(req) });
        await setSessionCookie(token);
        return ok(user);
    });
}
