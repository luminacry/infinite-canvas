// 限流 / 幂等 / 分布式锁的存储层。
// 生产用 Redis；当 REDIS_URL 为空或设为 "memory" 时回退到单进程内存实现（仅用于本地开发，多实例下不安全）。
import "server-only";
import Redis from "ioredis";

const rawUrl = process.env.REDIS_URL?.trim();
const useMemory = !rawUrl || rawUrl === "memory";

type Limiter = { rateLimit(key: string, limit: number, windowSec: number): Promise<boolean>; acquireLock(key: string, ttlMs: number): Promise<boolean>; releaseLock(key: string): Promise<void> };

function createRedisLimiter(): Limiter {
    const g = globalThis as unknown as { redis?: Redis };
    const redis = g.redis ?? new Redis(rawUrl as string, { maxRetriesPerRequest: 3 });
    if (process.env.NODE_ENV !== "production") g.redis = redis;
    return {
        async rateLimit(key, limit, windowSec) {
            const count = await redis.incr(`rl:${key}`);
            if (count === 1) await redis.expire(`rl:${key}`, windowSec);
            return count <= limit;
        },
        async acquireLock(key, ttlMs) {
            return (await redis.set(`lock:${key}`, "1", "PX", ttlMs, "NX")) === "OK";
        },
        async releaseLock(key) {
            await redis.del(`lock:${key}`);
        },
    };
}

function createMemoryLimiter(): Limiter {
    const g = globalThis as unknown as { memCounters?: Map<string, { n: number; exp: number }>; memLocks?: Map<string, number> };
    const counters = (g.memCounters ??= new Map());
    const locks = (g.memLocks ??= new Map());
    const now = () => Date.now();
    return {
        async rateLimit(key, limit, windowSec) {
            const k = `rl:${key}`;
            const cur = counters.get(k);
            if (!cur || cur.exp < now()) {
                counters.set(k, { n: 1, exp: now() + windowSec * 1000 });
                return true;
            }
            cur.n += 1;
            return cur.n <= limit;
        },
        async acquireLock(key, ttlMs) {
            const exp = locks.get(key);
            if (exp && exp > now()) return false;
            locks.set(key, now() + ttlMs);
            return true;
        },
        async releaseLock(key) {
            locks.delete(key);
        },
    };
}

const limiter = useMemory ? createMemoryLimiter() : createRedisLimiter();

export const rateLimit = limiter.rateLimit;
export const acquireLock = (key: string, ttlMs = 5000) => limiter.acquireLock(key, ttlMs);
export const releaseLock = limiter.releaseLock;
