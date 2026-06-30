// 会话解析与权限校验。路由处理用 requireUser/requireAdmin 取当前用户。
import "server-only";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { UnauthorizedError, ForbiddenError } from "./errors";

/** 读取当前会话用户；无有效会话返回 null。 */
export async function getCurrentUser(): Promise<User | null> {
    const token = (await cookies()).get(env.sessionCookieName)?.value;
    if (!token) return null;
    const session = await db.session.findUnique({ where: { id: token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return null;
    if (session.user.status === "banned") return null;
    return session.user;
}

/** 取当前用户，未登录抛 UnauthorizedError（由 http.handle 统一转响应）。 */
export async function requireUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    return user;
}

/** 在路由处理中写入会话 Cookie（httpOnly + SameSite=Lax + 生产 Secure）。 */
export async function setSessionCookie(token: string): Promise<void> {
    (await cookies()).set(env.sessionCookieName, token, {
        httpOnly: true,
        secure: env.isProd,
        sameSite: "lax",
        path: "/",
        maxAge: env.sessionTtlDays * 86400,
    });
}

/** 清除会话 Cookie。 */
export async function clearSessionCookie(): Promise<void> {
    (await cookies()).delete(env.sessionCookieName);
}

/** 读取当前会话 token（用于登出时销毁 DB 会话）。 */
export async function getSessionToken(): Promise<string | undefined> {
    return (await cookies()).get(env.sessionCookieName)?.value;
}

const ROLE_RANK: Record<Role, number> = { user: 0, admin: 1, superadmin: 2 };

/** 取当前用户并要求达到指定角色，否则抛 ForbiddenError。 */
export async function requireRole(min: Role): Promise<User> {
    const user = await requireUser();
    if (ROLE_RANK[user.role] < ROLE_RANK[min]) throw new ForbiddenError();
    return user;
}

export const requireAdmin = () => requireRole("admin");
