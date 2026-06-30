// 账号服务：注册/登录/会话。密码用 bcrypt 哈希，会话存 DB + httpOnly Cookie。
import "server-only";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { env } from "../env";
import { AppError } from "../errors";
import { applyLedger } from "./credit-service";

export type PublicUser = { id: string; email: string; username: string; role: string; creditBalance: number };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function toPublicUser(u: { id: string; email: string; username: string; role: string; creditBalance: number }): PublicUser {
    return { id: u.id, email: u.email, username: u.username, role: u.role, creditBalance: u.creditBalance };
}

export async function registerUser(email: string, username: string, password: string): Promise<PublicUser> {
    email = email.trim().toLowerCase();
    username = username.trim();
    if (!EMAIL_RE.test(email)) throw new AppError("邮箱格式不正确");
    if (username.length < 2 || username.length > 24) throw new AppError("用户名需 2-24 个字符");
    if (password.length < 8) throw new AppError("密码至少 8 位");

    const exists = await db.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true, username: true } });
    if (exists?.email === email) throw new AppError("邮箱已被注册");
    if (exists?.username === username) throw new AppError("用户名已被占用");

    const passwordHash = await bcrypt.hash(password, 10);
    // 建用户 + 发注册赠送点，放同一事务
    const user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { email, username, passwordHash } });
        if (env.signupBonusCredits > 0) {
            await applyLedger({ userId: created.id, delta: env.signupBonusCredits, reason: "signup_bonus", remark: "注册赠送" }, tx);
        }
        return tx.user.findUniqueOrThrow({ where: { id: created.id } });
    });
    return toPublicUser(user);
}

export async function verifyLogin(email: string, password: string): Promise<PublicUser> {
    email = email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError("邮箱或密码错误");
    if (user.status === "banned") throw new AppError("账号已被封禁");
    return toPublicUser(user);
}

export async function createSession(userId: string, meta: { userAgent?: string; ip?: string }): Promise<string> {
    const expiresAt = new Date(Date.now() + env.sessionTtlDays * 86400_000);
    const session = await db.session.create({ data: { userId, expiresAt, userAgent: meta.userAgent, ip: meta.ip } });
    return session.id;
}

export async function destroySession(token: string): Promise<void> {
    await db.session.deleteMany({ where: { id: token } });
}
