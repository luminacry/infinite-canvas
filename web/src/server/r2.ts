// Cloudflare R2（S3 兼容）对象存储。生成产物（图片/视频/音频）落这里，DB 只存 key。
import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
    },
});

/** 上传一个对象，返回其在桶内的 key。key 形如 u/{userId}/{recordId}/0.png。 */
export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
    await r2.send(new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: body, ContentType: contentType }));
    return key;
}

/** 生成读取用的临时签名 URL（默认 1 小时）。绑定了公开域时也可直接拼 publicBase。 */
export async function signedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    if (env.r2.publicBase) return `${env.r2.publicBase.replace(/\/+$/, "")}/${key}`;
    return getSignedUrl(r2, new GetObjectCommand({ Bucket: env.r2.bucket, Key: key }), { expiresIn });
}

/** 约定的对象 key 前缀，便于按用户统计配额与封号清理。 */
export function objectKey(userId: string, recordId: string, index: number, ext: string): string {
    return `u/${userId}/${recordId}/${index}.${ext}`;
}
