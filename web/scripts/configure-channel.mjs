// 配置/更新一个上游渠道（key 加密入库）+ 该渠道下某模型某能力的定价。脚本本身不含任何密钥。
// 用法示例：
//   图片: CH_ID=seed-default CH_NAME=渠道1 CH_CAP=image CH_BASEURL=... CH_KEY=... CH_MODEL=gpt-image-2 node scripts/configure-channel.mjs
//   文本: CH_ID=seed-text   CH_NAME=渠道2 CH_CAP=text  CH_BASEURL=... CH_KEY=... CH_MODEL=gpt-5.5 CH_TIER=standard CH_COST=1 node scripts/configure-channel.mjs
import { PrismaClient } from "@prisma/client";
import { createCipheriv, createHash, randomBytes } from "node:crypto";

function encrypt(plain) {
    const key = createHash("sha256").update(process.env.DATA_ENCRYPTION_KEY || "dev-insecure-key").digest();
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
    return `${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${enc.toString("base64")}`;
}

const db = new PrismaClient();
const id = process.env.CH_ID || "seed-default";
const name = process.env.CH_NAME || "渠道1";
const type = process.env.CH_TYPE || "openai";
const cap = process.env.CH_CAP || "image";
const baseUrl = process.env.CH_BASEURL;
const apiKey = process.env.CH_KEY;
const model = process.env.CH_MODEL || (cap === "image" ? "gpt-image-2" : "gpt-5.5");
if (!baseUrl || !apiKey) {
    console.error("缺少 CH_BASEURL 或 CH_KEY");
    process.exit(1);
}

await db.aiChannel.upsert({
    where: { id },
    update: { name, type, baseUrl, apiKeyEnc: encrypt(apiKey), enabled: true },
    create: { id, name, type, baseUrl, apiKeyEnc: encrypt(apiKey), enabled: true },
});

if (cap === "image") {
    // 图片：1k/2k/4k 三档（已有则归到该渠道名）
    await db.modelPricing.updateMany({ where: { model, capability: "image" }, data: { channel: name } });
    for (const [tier, cost] of [["t1k", 5], ["t2k", 12], ["t4k", 30]]) {
        await db.modelPricing.upsert({
            where: { channel_model_capability_sizeTier: { channel: name, model, capability: "image", sizeTier: tier } },
            update: { creditsCost: cost, enabled: true },
            create: { channel: name, model, capability: "image", sizeTier: tier, creditsCost: cost, enabled: true },
        });
    }
} else {
    // 文本/音频/视频：standard 单档
    const tier = process.env.CH_TIER || "standard";
    const cost = Number(process.env.CH_COST || 1);
    await db.modelPricing.upsert({
        where: { channel_model_capability_sizeTier: { channel: name, model, capability: cap, sizeTier: tier } },
        update: { creditsCost: cost, enabled: true },
        create: { channel: name, model, capability: cap, sizeTier: tier, creditsCost: cost, enabled: true },
    });
}

console.log(`channel=${name} cap=${cap} model=${model} 已配置（baseUrl/key 加密入库，不回显）`);
await db.$disconnect();
