// 生成任务 Worker（独立进程）。消费 BullMQ 队列，执行图片生成。
// 运行：npm run worker  （= tsx --conditions=react-server worker/index.ts）
//   react-server 条件让 "server-only" 解析成空模块，可在纯 Node 下跑 server/* 代码。
import "dotenv/config";
import { Worker } from "bullmq";
import { GENERATE_QUEUE, queueConnection, queueEnabled, type GenerateJob } from "@/server/queue";
import { runImageJob } from "@/server/services/gen-service";

if (!queueEnabled) {
    console.error("[worker] REDIS_URL 未配置或为 memory，队列未启用。请配置真实 Redis 后再启动 worker。");
    process.exit(1);
}

const concurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY) || 8);

const worker = new Worker<GenerateJob>(
    GENERATE_QUEUE,
    async (job) => {
        console.log(`[worker] 处理任务 ${job.id} (record=${job.data.recordId})`);
        await runImageJob(job.data.recordId);
    },
    { connection: queueConnection(), concurrency },
);

worker.on("completed", (job) => console.log(`[worker] 完成 ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] 失败 ${job?.id}: ${err?.message}`));

console.log(`[worker] 已启动，并发=${concurrency}，队列=${GENERATE_QUEUE}`);

const shutdown = async () => {
    await worker.close();
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
