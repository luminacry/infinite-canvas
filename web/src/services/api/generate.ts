// 调自家 AI 代理网关（替代浏览器直连上游）。后端鉴权、扣费、落库后返回产物 URL。
import { api } from "./client";
import type { SizeTier } from "@/lib/size-tier";

export type ProxyImageRequest = {
    model: string;
    prompt: string;
    size?: string;
    quality?: string;
    count?: number;
    idempotencyKey?: string;
};

export type ProxyImageResult = {
    recordId: string;
    creditsCost: number;
    balance: number;
    images: { id: string; url: string }[];
};

export type Estimate = { sizeTier: SizeTier; unitCost: number | null; count: number; creditsCost: number | null };

export const generateApi = {
    image: (req: ProxyImageRequest) => api.post<ProxyImageResult>("/api/generate/image", req),
    estimate: (params: { model: string; capability?: string; quality?: string; size?: string; count?: number }) => {
        const sp = new URLSearchParams();
        sp.set("model", params.model);
        if (params.capability) sp.set("capability", params.capability);
        if (params.quality) sp.set("quality", params.quality);
        if (params.size) sp.set("size", params.size);
        if (params.count) sp.set("count", String(params.count));
        return api.get<Estimate>(`/api/generate/estimate?${sp.toString()}`);
    },
};
