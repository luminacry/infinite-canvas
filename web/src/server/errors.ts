// 用户可见的业务错误。handle() 会原样返回 AppError.message；其它异常一律收敛为「服务器内部错误」。
export class AppError extends Error {
    code: number;
    status: number;
    constructor(message: string, code = 1, status = 400) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.status = status;
    }
}

export class UnauthorizedError extends AppError {
    constructor() {
        super("未登录或会话已过期", 401, 401);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends AppError {
    constructor() {
        super("没有权限", 403, 403);
        this.name = "ForbiddenError";
    }
}

export class InsufficientCreditsError extends AppError {
    constructor() {
        super("算力点不足，请充值后重试", 402, 402);
        this.name = "InsufficientCreditsError";
    }
}
