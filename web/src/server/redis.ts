// Redis 单例。用于会话缓存、限流、幂等键、兑换/扣费分布式锁。
import "server-only";
import Redis from "ioredis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ?? new Redis(env.redisUrl, { maxRetriesPerRequest: 3 });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/** 简单滑动窗口限流：在 windowSec 秒内最多 limit 次，返回是否放行。 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    return count <= limit;
}

/** 获取一个短期互斥锁（兑换、扣费等关键路径用），返回是否拿到锁。 */
export async function acquireLock(key: string, ttlMs = 5000): Promise<boolean> {
    const result = await redis.set(`lock:${key}`, "1", "PX", ttlMs, "NX");
    return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
    await redis.del(`lock:${key}`);
}
