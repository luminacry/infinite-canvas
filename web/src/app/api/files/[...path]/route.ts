// 本地存储回退的读取路由（仅当未配置 R2 时使用；生产应走 R2 公开域/预签名）。
import { readFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import { NextResponse } from "next/server";
import { localStoreDir, usingLocalStore } from "@/server/r2";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    if (!usingLocalStore) return new NextResponse("Not found", { status: 404 });
    const { path } = await params;
    // 防目录穿越：拼接后必须仍在 localStoreDir 内
    const target = resolve(join(localStoreDir, normalize(path.join("/"))));
    if (!target.startsWith(resolve(localStoreDir))) return new NextResponse("Forbidden", { status: 403 });
    try {
        const data = await readFile(target);
        const ext = target.split(".").pop()?.toLowerCase() || "";
        return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
    } catch {
        return new NextResponse("Not found", { status: 404 });
    }
}
