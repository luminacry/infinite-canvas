// 对象存储：生成产物（图片/视频/音频）落这里，DB 只存 key。
// 生产用 Cloudflare R2（S3 兼容）；未配置 R2 时回退到本机磁盘（仅本地开发，通过 /api/files 提供读取）。
import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

const useR2 = Boolean(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket);
const LOCAL_DIR = resolve(process.cwd(), ".localstore");

let r2Client: S3Client | null = null;
function client(): S3Client {
    if (!r2Client) {
        r2Client = new S3Client({
            region: "auto",
            endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
        });
    }
    return r2Client;
}

/** 上传一个对象，返回其在桶内的 key。key 形如 u/{userId}/{recordId}/0.png。 */
export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
    if (!useR2) {
        const path = join(LOCAL_DIR, key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, body);
        return key;
    }
    await client().send(new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: body, ContentType: contentType }));
    return key;
}

/** 生成读取用的 URL。R2 用预签名/公开域；本地回退走 /api/files 路由。 */
export async function signedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!useR2) return `/api/files/${key}`;
    if (env.r2.publicBase) return `${env.r2.publicBase.replace(/\/+$/, "")}/${key}`;
    return getSignedUrl(client(), new GetObjectCommand({ Bucket: env.r2.bucket, Key: key }), { expiresIn });
}

/** 本地回退的存储根目录（仅 /api/files 路由使用）。 */
export const localStoreDir = LOCAL_DIR;
export const usingLocalStore = !useR2;

/** 约定的对象 key 前缀，便于按用户统计配额与封号清理。 */
export function objectKey(userId: string, recordId: string, index: number, ext: string): string {
    return `u/${userId}/${recordId}/${index}.${ext}`;
}
