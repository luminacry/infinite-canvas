// 个人中心数据：生成历史与图库（把 R2 object key 转成可访问的签名 URL）。
import "server-only";
import { db } from "../db";
import { signedGetUrl } from "../r2";
import type { Prisma } from "@prisma/client";

type OutputItem = { key: string; mimeType?: string };

export type GenerationView = {
    id: string;
    capability: string;
    model: string;
    prompt: string;
    sizeTier: string;
    status: string;
    creditsCost: number;
    createdAt: Date;
    outputs: { url: string; mimeType?: string }[];
};

async function toView(rec: { id: string; capability: string; model: string; prompt: string; sizeTier: string; status: string; creditsCost: number; createdAt: Date; outputs: Prisma.JsonValue }): Promise<GenerationView> {
    const items = (Array.isArray(rec.outputs) ? rec.outputs : []) as OutputItem[];
    const outputs = await Promise.all(items.map(async (o) => ({ url: await signedGetUrl(o.key), mimeType: o.mimeType })));
    return { id: rec.id, capability: rec.capability, model: rec.model, prompt: rec.prompt, sizeTier: rec.sizeTier, status: rec.status, creditsCost: rec.creditsCost, createdAt: rec.createdAt, outputs };
}

/** 生成历史分页（可按能力筛选）。 */
export async function listGenerations(userId: string, page = 1, pageSize = 20, capability?: string) {
    const where: Prisma.GenerationRecordWhereInput = { userId, ...(capability ? { capability } : {}) };
    const [rows, total] = await Promise.all([
        db.generationRecord.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        db.generationRecord.count({ where }),
    ]);
    const items = await Promise.all(rows.map(toView));
    return { items, total, page, pageSize };
}

/** 个人中心概览：累计生成数、成功/失败、成功率、本月消耗算力点。 */
export async function getOverview(userId: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, success, failed, monthSpentAgg, user] = await Promise.all([
        db.generationRecord.count({ where: { userId } }),
        db.generationRecord.count({ where: { userId, status: "success" } }),
        db.generationRecord.count({ where: { userId, status: "failed" } }),
        db.creditLedger.aggregate({
            _sum: { delta: true },
            where: { userId, reason: "generate", createdAt: { gte: monthStart } },
        }),
        db.user.findUnique({ where: { id: userId }, select: { creditBalance: true } }),
    ]);

    // generate 流水 delta 为负，取绝对值作为本月消耗
    const monthSpent = Math.abs(monthSpentAgg._sum.delta ?? 0);
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return {
        balance: user?.creditBalance ?? 0,
        totalGenerations: total,
        successCount: success,
        failedCount: failed,
        successRate,
        monthSpent,
    };
}

/** 图库：仅成功的图片产物，铺平成图片列表。 */
export async function listGallery(userId: string, page = 1, pageSize = 24) {
    const where: Prisma.GenerationRecordWhereInput = { userId, capability: "image", status: "success" };
    const [rows, total] = await Promise.all([
        db.generationRecord.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        db.generationRecord.count({ where }),
    ]);
    const views = await Promise.all(rows.map(toView));
    const images = views.flatMap((v) => v.outputs.map((o, i) => ({ id: `${v.id}-${i}`, url: o.url, prompt: v.prompt, model: v.model, createdAt: v.createdAt })));
    return { items: images, total, page, pageSize };
}
