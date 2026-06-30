// 自家后端请求封装。统一携带 Cookie、解析 {code,data,msg}，非 0 抛错（带 code 便于前端分流）。
export type ApiEnvelope<T> = { code: number; data: T | null; msg: string };

export class ApiError extends Error {
    code: number;
    status: number;
    constructor(message: string, code: number, status: number) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.status = status;
    }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
        method,
        credentials: "include",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let envelope: ApiEnvelope<T>;
    try {
        envelope = await res.json();
    } catch {
        throw new ApiError("服务器无响应", 1, res.status);
    }
    if (envelope.code !== 0) throw new ApiError(envelope.msg || "请求失败", envelope.code, res.status);
    return envelope.data as T;
}

export const api = {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
};
