// 统一响应结构 { code, data, msg }，沿用项目历史后端约定。
// code: 0 成功；非 0 业务错误码（与 HTTP 状态分离，便于前端统一处理）。
import { NextResponse } from "next/server";
import { AppError } from "./errors";

export type ApiBody<T> = { code: number; data: T | null; msg: string };

export function ok<T>(data: T, msg = "ok"): NextResponse<ApiBody<T>> {
    return NextResponse.json({ code: 0, data, msg });
}

export function fail(msg: string, code = 1, status = 400): NextResponse<ApiBody<null>> {
    return NextResponse.json({ code, data: null, msg }, { status });
}

// 常用语义错误，统一文案与状态码
export const errUnauthorized = () => fail("未登录或会话已过期", 401, 401);
export const errForbidden = () => fail("没有权限", 403, 403);
export const errInsufficientCredits = () => fail("算力点不足，请充值后重试", 402, 402);
export const errRateLimited = () => fail("操作过于频繁，请稍后重试", 429, 429);

/** 包裹路由处理，统一捕获异常为 fail，避免泄漏堆栈到前端。 */
export async function handle<T>(fn: () => Promise<NextResponse<ApiBody<T>>>): Promise<NextResponse<ApiBody<T | null>>> {
    try {
        return await fn();
    } catch (error) {
        // 业务错误：原样返回用户可见文案
        if (error instanceof AppError) return fail(error.message, error.code, error.status);
        // 其它异常：收敛为内部错误，不泄漏堆栈
        if (process.env.NODE_ENV !== "production") console.error("[api] unhandled:", error);
        return fail("服务器内部错误", 1, 500);
    }
}
