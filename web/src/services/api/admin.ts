import { api } from "./client";
import type { Paged } from "./credits";

export type AdminUser = { id: string; email: string; username: string; role: string; status: string; creditBalance: number; createdAt: string };
export type AdminGeneration = { id: string; userId: string; model: string; capability: string; sizeTier: string; status: string; creditsCost: number; prompt: string; createdAt: string };
export type AdminCode = { id: string; credits: number; batchId: string | null; status: string; usedBy: string | null; usedAt: string | null; expiresAt: string | null; createdAt: string };
export type Pricing = { id: string; channel: string; model: string; capability: string; sizeTier: string; creditsCost: number; enabled: boolean };
export type Channel = { id: string; name: string; type: string; baseUrl: string; weight: number; enabled: boolean };
export type Stats = { totalUsers: number; newUsers: number; genTotal: number; genFailRate: number; creditsConsumed: number; redeemAmount: number };

export const adminApi = {
    users: (page = 1, pageSize = 20, keyword?: string) => api.get<Paged<AdminUser>>(`/api/admin/users?page=${page}&pageSize=${pageSize}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`),
    banUser: (id: string, banned: boolean) => api.post<null>(`/api/admin/users/${id}/ban`, { banned }),
    adjustCredits: (id: string, delta: number, remark: string) => api.post<{ balance: number }>(`/api/admin/users/${id}/credits`, { delta, remark }),
    generations: (page = 1, pageSize = 20, filter: { userId?: string; status?: string; model?: string } = {}) => {
        const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        Object.entries(filter).forEach(([k, v]) => v && sp.set(k, v));
        return api.get<Paged<AdminGeneration>>(`/api/admin/generations?${sp.toString()}`);
    },
    codes: (page = 1, pageSize = 20, filter: { batchId?: string; status?: string } = {}) => {
        const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        Object.entries(filter).forEach(([k, v]) => v && sp.set(k, v));
        return api.get<Paged<AdminCode>>(`/api/admin/codes?${sp.toString()}`);
    },
    genCodes: (credits: number, count: number, expiresAt?: string) => api.post<{ batchId: string; codes: string[] }>("/api/admin/codes/batch", { credits, count, expiresAt }),
    disableCodes: (batchId: string) => api.post<{ count: number }>("/api/admin/codes/disable", { batchId }),
    pricing: () => api.get<Pricing[]>("/api/admin/pricing"),
    upsertPricing: (p: Omit<Pricing, "id">) => api.post<Pricing>("/api/admin/pricing", p),
    channels: () => api.get<Channel[]>("/api/admin/channels"),
    upsertChannel: (c: Partial<Channel> & { apiKey?: string }) => api.post<{ id: string }>("/api/admin/channels", c),
    stats: () => api.get<Stats>("/api/admin/stats"),
};
