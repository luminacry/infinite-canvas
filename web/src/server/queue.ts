// 生成任务队列（BullMQ / Redis）。
// 生产：真 Redis + 独立 worker 消费。开发无 Redis（REDIS_URL=memory）：queueEnabled=false，
// 提交端会退回到「进程内直接执行」，保证本地也能跑（见 gen-service.enqueueImage）。
import "server-only";
import { Queue, type ConnectionOptions } from "bullmq";

const rawUrl = process.env.REDIS_URL?.trim();
export const queueEnabled = Boolean(rawUrl) && rawUrl !== "memory";

export const GENERATE_QUEUE = "generate";

export type GenerateJob = {
    recordId: string;
    userId: string;
};

// BullMQ 需要 maxRetriesPerRequest=null 的连接
export function queueConnection(): ConnectionOptions {
    return { url: rawUrl, maxRetriesPerRequest: null } as ConnectionOptions;
}

const g = globalThis as unknown as { generateQueue?: Queue<GenerateJob> };

export function getGenerateQueue(): Queue<GenerateJob> | null {
    if (!queueEnabled) return null;
    if (!g.generateQueue) {
        g.generateQueue = new Queue<GenerateJob>(GENERATE_QUEUE, {
            connection: queueConnection(),
            defaultJobOptions: {
                attempts: 2, // 上游超时/抖动重试 1 次
                backoff: { type: "fixed", delay: 3000 },
                removeOnComplete: 500,
                removeOnFail: 1000,
            },
        });
    }
    return g.generateQueue;
}
