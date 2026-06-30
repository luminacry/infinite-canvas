import { api } from "./client";

export type LedgerReason = "redeem" | "generate" | "refund" | "admin_adjust" | "signup_bonus";
export type LedgerItem = {
    id: string;
    delta: number;
    balance: number;
    reason: LedgerReason;
    refType: string | null;
    refId: string | null;
    remark: string | null;
    createdAt: string;
};
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export const creditsApi = {
    balance: () => api.get<{ balance: number }>("/api/credits/balance"),
    ledger: (page = 1, pageSize = 20) => api.get<Paged<LedgerItem>>(`/api/credits/ledger?page=${page}&pageSize=${pageSize}`),
    redeem: (code: string) => api.post<{ credits: number; balance: number }>("/api/credits/redeem", { code }),
};

export const LEDGER_REASON_LABEL: Record<LedgerReason, string> = {
    redeem: "兑换充值",
    generate: "生成消费",
    refund: "失败退点",
    admin_adjust: "管理员调整",
    signup_bonus: "注册赠送",
};
