import { api } from "./client";
import type { Paged } from "./credits";

export type GenerationItem = {
    id: string;
    capability: string;
    model: string;
    prompt: string;
    sizeTier: string;
    status: "pending" | "success" | "failed";
    creditsCost: number;
    createdAt: string;
    outputs: { url: string; mimeType?: string }[];
};

export type GalleryImage = { id: string; url: string; prompt: string; model: string; createdAt: string };

export type AccountOverview = {
    balance: number;
    totalGenerations: number;
    successCount: number;
    failedCount: number;
    successRate: number;
    monthSpent: number;
};

export const meApi = {
    overview: () => api.get<AccountOverview>("/api/me/overview"),
    generations: (page = 1, pageSize = 20, capability?: string) => {
        const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (capability) sp.set("capability", capability);
        return api.get<Paged<GenerationItem>>(`/api/me/generations?${sp.toString()}`);
    },
    gallery: (page = 1, pageSize = 24) => api.get<Paged<GalleryImage>>(`/api/me/gallery?page=${page}&pageSize=${pageSize}`),
};
