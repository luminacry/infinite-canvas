// 上游 AI Key 的对称加密（AES-256-GCM）。明文 Key 只在内存解密使用，DB 存密文。
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { env } from "./env";

// 由 DATA_ENCRYPTION_KEY 派生 32 字节密钥（容忍 hex/任意字符串）
function key(): Buffer {
    if (!env.dataEncryptionKey) throw new Error("缺少 DATA_ENCRYPTION_KEY，无法加解密渠道 Key");
    return createHash("sha256").update(env.dataEncryptionKey).digest();
}

/** 加密，返回 base64(iv).base64(tag).base64(cipher)。 */
export function encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

/** 解密 encrypt() 的输出。 */
export function decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) throw new Error("密文格式错误");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
