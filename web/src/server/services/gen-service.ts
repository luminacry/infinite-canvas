// 生成编排（异步队列版）：
//  - enqueueImage：事务内预扣点 + 建 pending 记录 + 入队，秒回 recordId（不阻塞）。
//  - runImageJob：worker 消费队列后执行——调上游 → 落 R2 → 结算/失败退点 → 更新状态与进度。
// 无队列（本地 REDIS_URL=memory）时，enqueueImage 退回到进程内 fire-and-forget 执行。
import "server-only";
import { db } from "../db";
import { AppError } from "../errors";
import { charge, refund } from "./credit-service";
import { resolveModel } from "./pricing-service";
import { putObject, signedGetUrl, objectKey } from "../r2";
import { generateImageOpenAI, editImageOpenAI } from "../ai/openai-image";
import { getGenerateQueue } from "../queue";
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

const EXT_BY_MIME: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// 入队时把请求参数存进记录的 params，worker 取出执行（含参考图/蒙版）。
type ImageParams = { size?: string; quality?: string; count: number; mode?: "generation" | "edit"; references?: string[]; mask?: string };

/**
 * 提交端：归档档位 → 查价取渠道 → 事务内(预扣点 + 建 pending 记录) → 入队。秒回 recordId。
 * 余额不足在事务内抛 InsufficientCreditsError（402）。不调用上游、不阻塞。
 */
export async function enqueueImage(userId: string, req: ImageRequest): Promise<{ recordId: string }> {
    const count = Math.max(1, Math.min(10, Math.floor(req.count || 1)));
    const sizeTier: SizeTier = resolveSizeTierFromInput(req.quality || req.size);
    const { creditsCost, channel } = await resolveModel(req.model, "image", sizeTier);
    const totalCost = creditsCost * count;
    const params: ImageParams = { size: req.size, quality: req.quality, count, mode: req.mode, references: req.references, mask: req.mask };

    const record = await db.$transaction(async (tx) => {
        const rec = await tx.generationRecord.create({
            data: { userId, channel: channel.name, model: req.model, capability: "image", sizeTier, prompt: req.prompt, params, status: "pending", progress: 0, creditsHeld: totalCost },
        });
        await charge(userId, totalCost, { reason: "generate", refType: "generation", refId: rec.id, remark: `${req.model} ${sizeTier}×${count}` }, tx);
        return rec;
    });

    const queue = getGenerateQueue();
    if (queue) {
        await queue.add("image", { recordId: record.id, userId }, { jobId: record.id });
    } else {
        // 本地无 Redis：进程内后台执行（不阻塞返回）
        void runImageJob(record.id).catch(() => {});
    }
    return { recordId: record.id };
}

/**
 * 执行端（worker 调用）：取记录 → 调上游 → 落 R2 → 事务结算 / 失败退点 → 更新状态与进度。
 * 幂等：仅处理仍为 pending 的记录，重复投递直接跳过。
 */
export async function runImageJob(recordId: string): Promise<void> {
    const record = await db.generationRecord.findUnique({ where: { id: recordId } });
    if (!record || record.status !== "pending") return; // 已处理/不存在，幂等跳过

    const p = (record.params ?? {}) as ImageParams;
    const count = p.count ?? 1;
    const totalCost = record.creditsHeld;

    try {
        const { channel } = await resolveModel(record.model, "image", record.sizeTier);
        await db.generationRecord.update({ where: { id: recordId }, data: { progress: 10 } });

        const genInput = { model: record.model, prompt: record.prompt, size: p.size, quality: p.quality, count };
        const result =
            p.mode === "edit" && p.references?.length
                ? await editImageOpenAI(channel, genInput, await Promise.all(p.references.map(fetchBytes)), p.mask ? await fetchBytes(p.mask) : undefined)
                : await generateImageOpenAI(channel, genInput);

        await db.generationRecord.update({ where: { id: recordId }, data: { progress: 70 } });

        const outputs = await Promise.all(
            result.images.map(async (img, i) => {
                const ext = EXT_BY_MIME[img.mimeType] || "png";
                const key = objectKey(record.userId, recordId, i, ext);
                await putObject(key, img.buffer, img.mimeType);
                return { key, mimeType: img.mimeType };
            }),
        );
        await db.generationRecord.update({ where: { id: recordId }, data: { status: "success", progress: 100, creditsCost: totalCost, outputs, upstreamId: result.upstreamId } });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "生成失败";
        await refund(record.userId, totalCost, { refType: "generation", refId: recordId, remark: "生成失败退点" });
        await db.generationRecord.update({ where: { id: recordId }, data: { status: "failed", progress: 100, errorMsg: msg.slice(0, 500) } });
        throw new AppError(error instanceof AppError ? msg : `生成失败：${msg}`, 1, 502); // 抛出让 BullMQ 记录/重试
    }
}

/** 查询任务状态（status 路由用）。成功时把 R2 key 转签名 URL。 */
export async function getGenerationStatus(recordId: string, userId: string) {
    const rec = await db.generationRecord.findUnique({ where: { id: recordId } });
    if (!rec || rec.userId !== userId) return null;
    const outputs = (Array.isArray(rec.outputs) ? rec.outputs : []) as { key: string; mimeType?: string }[];
    const images = rec.status === "success" ? await Promise.all(outputs.map(async (o, i) => ({ id: `${rec.id}-${i}`, url: await signedGetUrl(o.key) }))) : [];
    return { recordId: rec.id, status: rec.status, progress: rec.progress, creditsCost: rec.creditsCost, images, error: rec.errorMsg ?? undefined };
}
