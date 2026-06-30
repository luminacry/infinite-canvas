import type { NextRequest } from "next/server";
import { fail, handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/redis";
import { db } from "@/server/db";
import { charge, refund } from "@/server/services/credit-service";
import { resolveModel } from "@/server/services/pricing-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function joinUrl(baseUrl: string, path: string) {
    const base = baseUrl.replace(/\/+$/, "");
    return /\/v\d+$/.test(base) ? `${base}${path}` : `${base}/v1${path}`;
}

// 文本走独立渠道（capability=text），与图片渠道分开解析；按固定档位(standard)扣点，SSE 透传上游。
export async function POST(req: NextRequest) {
    const user = await requireUser().catch(() => null);
    if (!user) return fail("未登录或会话已过期", 401, 401);
    if (!(await rateLimit(`gentext:${user.id}`, 30, 60))) return fail("请求过于频繁，请稍后再试", 429, 429);

    const { model, payload } = await req.json().catch(() => ({}));
    if (!model || !payload) return fail("缺少模型或请求体");

    let resolved;
    try {
        resolved = await resolveModel(model, "text", "standard");
    } catch (e) {
        return fail(e instanceof Error ? e.message : "文本渠道未配置", 1, 400);
    }
    const { creditsCost, channel } = resolved;

    // 预扣 + 建记录
    let recordId: string;
    try {
        recordId = await db.$transaction(async (tx) => {
            const rec = await tx.generationRecord.create({
                data: { userId: user.id, channel: channel.name, model, capability: "text", sizeTier: "standard", prompt: summarize(payload), params: {}, status: "pending", creditsHeld: creditsCost },
            });
            await charge(user.id, creditsCost, { reason: "generate", refType: "generation", refId: rec.id, remark: `${model} text` }, tx);
            return rec.id;
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "扣费失败";
        return fail(msg, msg.includes("算力点") ? 402 : 1, msg.includes("算力点") ? 402 : 400);
    }

    // 调上游 /chat/completions（兼容性最好），失败退点；成功则把 chat SSE 转成前端已支持的 responses delta SSE。
    let upstream: Response;
    try {
        upstream = await fetch(joinUrl(channel.baseUrl, "/chat/completions"), {
            method: "POST",
            headers: { Authorization: `Bearer ${channel.apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" },
            body: JSON.stringify(toChatBody(payload)),
        });
    } catch (e) {
        await refund(user.id, creditsCost, { refType: "generation", refId: recordId, remark: "文本生成失败退点" });
        await db.generationRecord.update({ where: { id: recordId }, data: { status: "failed", errorMsg: e instanceof Error ? e.message.slice(0, 300) : "上游请求失败" } });
        return fail("文本生成失败，已退点", 1, 502);
    }

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        await refund(user.id, creditsCost, { refType: "generation", refId: recordId, remark: "文本生成失败退点" });
        await db.generationRecord.update({ where: { id: recordId }, data: { status: "failed", errorMsg: `上游 ${upstream.status}: ${text.slice(0, 200)}` } });
        return fail(`上游返回 ${upstream.status}`, 1, 502);
    }

    await db.generationRecord.update({ where: { id: recordId }, data: { status: "success", creditsCost } });
    return new Response(chatToResponsesSSE(upstream.body), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
}

type ResponsesItem = { role?: string; content?: unknown; type?: string };

// 把前端 responses 格式的 input 转成 chat/completions 的 messages。
function toChatBody(payload: { model?: string; input?: ResponsesItem[]; messages?: unknown[]; tools?: unknown }) {
    if (payload.messages) return { ...payload, stream: true };
    const messages = (payload.input ?? [])
        .filter((it) => it.role && it.content !== undefined)
        .map((it) => ({
            role: it.role,
            content: Array.isArray(it.content)
                ? it.content.map((c: { type?: string; text?: string; image_url?: string }) => (c.type === "input_image" ? { type: "image_url", image_url: { url: c.image_url } } : { type: "text", text: c.text ?? "" }))
                : it.content,
        }));
    return { model: payload.model, messages, stream: true };
}

// chat/completions SSE -> 前端已支持的 response.output_text.delta SSE
function chatToResponsesSSE(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    return new ReadableStream({
        async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
            }
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                    const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
                    const delta = j.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "response.output_text.delta", delta })}\n\n`));
                } catch {
                    // 忽略非 JSON 行（注释/心跳）
                }
            }
        },
        cancel() {
            reader.cancel().catch(() => {});
        },
    });
}

function summarize(payload: unknown): string {
    try {
        const s = JSON.stringify(payload);
        return s.slice(0, 200);
    } catch {
        return "";
    }
}
