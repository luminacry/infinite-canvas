// 生成编排：鉴权后由路由调用。负责 预扣→代理→落 R2→结算/退点 的完整生命周期。
import "server-only";
import { db } from "../db";
import { AppError } from "../errors";
import { charge, refund } from "./credit-service";
import { resolveModel } from "./pricing-service";
import { putObject, signedGetUrl, objectKey } from "../r2";
import { generateImageOpenAI, editImageOpenAI } from "../ai/openai-image";
import { resolveSizeTierFromInput, type SizeTier } from "@/lib/size-tier";

export type ImageRequest = {
    model: string;
    prompt: string;
    size?: string;
    quality?: string;
    count?: number;
    mode?: "generation" | "edit";
    references?: string[]; // dataUrl 或 http(s) url
    mask?: string;
};

/**
 * 兜底对账：把超时仍 pending 的生成记录退点并标记失败。
 * 处理「上游极慢 / 客户端断开 / 进程重启」导致预扣未结算的孤儿记录。应由定时任务周期调用。
 */
export async function reconcilePending(maxAgeMs = 10 * 60_000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const stuck = await db.generationRecord.findMany({ where: { status: "pending", createdAt: { lt: cutoff } }, select: { id: true, userId: true, creditsHeld: true } });
    for (const rec of stuck) {
        if (rec.creditsHeld > 0) await refund(rec.userId, rec.creditsHeld, { refType: "generation", refId: rec.id, remark: "超时未完成，自动退点" });
        await db.generationRecord.update({ where: { id: rec.id }, data: { status: "failed", errorMsg: "超时未完成，已退点" } });
    }
    return stuck.length;
}

/** 把 dataUrl 或远程 url 解析为字节。 */
async function fetchBytes(src: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const m = src.match(/^data:([^;,]+);base64,(.+)$/);
    if (m) return { buffer: Buffer.from(m[2], "base64"), mimeType: m[1] };
    const res = await fetch(src);
    if (!res.ok) throw new Error(`参考图获取失败 ${res.status}`);
    return { buffer: Buffer.from(await res.arrayBuffer()), mimeType: res.headers.get("content-type") || "image/png" };
}

export type GenImageResult = {
    recordId: string;
    creditsCost: number;
    balance: number;
    images: { id: string; url: string }[];
};

const EXT_BY_MIME: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/**
 * 图片生成全链路：
 *  1) 归档分辨率档 → 查价 + 取渠道
 *  2) 事务内：建 GenerationRecord(pending) + 预扣点（余额不足直接 402，不调用上游）
 *  3) 调上游（失败则退点并标记 failed）
 *  4) 落 R2 → 标记 success（按档位单价结算，本期预扣即实扣）
 */
export async function generateImage(userId: string, req: ImageRequest): Promise<GenImageResult> {
    const count = Math.max(1, Math.min(10, Math.floor(req.count || 1)));
    const sizeTier: SizeTier = resolveSizeTierFromInput(req.quality || req.size);
    const { creditsCost, channel } = await resolveModel(req.model, "image", sizeTier);
    const totalCost = creditsCost * count;

    // 预扣 + 建记录（同一事务，余额不足在此抛 InsufficientCreditsError）
    const record = await db.$transaction(async (tx) => {
        const rec = await tx.generationRecord.create({
            data: {
                userId,
                channel: channel.name,
                model: req.model,
                capability: "image",
                sizeTier,
                prompt: req.prompt,
                params: { size: req.size, quality: req.quality, count },
                status: "pending",
                creditsHeld: totalCost,
            },
        });
        await charge(userId, totalCost, { reason: "generate", refType: "generation", refId: rec.id, remark: `${req.model} ${sizeTier}×${count}` }, tx);
        return rec;
    });

    // 调上游 + 落库；任何失败都退点
    try {
        const genInput = { model: req.model, prompt: req.prompt, size: req.size, quality: req.quality, count };
        const result =
            req.mode === "edit" && req.references?.length
                ? await editImageOpenAI(
                      channel,
                      genInput,
                      await Promise.all(req.references.map(fetchBytes)),
                      req.mask ? await fetchBytes(req.mask) : undefined,
                  )
                : await generateImageOpenAI(channel, genInput);
        const outputs = await Promise.all(
            result.images.map(async (img, i) => {
                const ext = EXT_BY_MIME[img.mimeType] || "png";
                const key = objectKey(userId, record.id, i, ext);
                await putObject(key, img.buffer, img.mimeType);
                return { key, mimeType: img.mimeType };
            }),
        );
        const balance = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { creditBalance: true } });
        await db.generationRecord.update({
            where: { id: record.id },
            data: { status: "success", creditsCost: totalCost, outputs, upstreamId: result.upstreamId },
        });
        const images = await Promise.all(outputs.map(async (o, i) => ({ id: `${record.id}-${i}`, url: await signedGetUrl(o.key) })));
        return { recordId: record.id, creditsCost: totalCost, balance: balance.creditBalance, images };
    } catch (error) {
        // 上游/落库任何失败：退回预扣点并标记 failed，再把可读错误抛给前端
        const msg = error instanceof Error ? error.message : "生成失败";
        await refund(userId, totalCost, { refType: "generation", refId: record.id, remark: "生成失败退点" });
        await db.generationRecord.update({ where: { id: record.id }, data: { status: "failed", errorMsg: msg.slice(0, 500) } });
        throw new AppError(error instanceof AppError ? msg : `生成失败：${msg}`, 1, 502);
    }
}
