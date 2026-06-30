// 从请求头提取 IP / UA，用于会话记录与限流键。
import type { NextRequest } from "next/server";

export function clientIp(req: NextRequest): string {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return req.headers.get("x-real-ip") || "0.0.0.0";
}

export function userAgent(req: NextRequest): string {
    return req.headers.get("user-agent") || "";
}
