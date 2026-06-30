// 分辨率档位归档：前端预估消耗与后端实际扣费共用同一套逻辑，保证一致。
// 与现有 image.ts 的 quality 体系对齐：1k/low≈1024、2k/medium≈2048、4k/high≈2880。
export type SizeTier = "t1k" | "t2k" | "t4k" | "standard";

const QUALITY_TIER: Record<string, SizeTier> = {
    "1k": "t1k",
    low: "t1k",
    standard: "t1k",
    "2k": "t2k",
    medium: "t2k",
    hd: "t2k",
    "4k": "t4k",
    high: "t4k",
};

/** 按长边像素归档：≤1024→t1k，≤2048→t2k，否则 t4k。介于两档之间向上取档。 */
export function resolveSizeTier(width: number, height: number): SizeTier {
    const longEdge = Math.max(width, height);
    if (longEdge <= 1024) return "t1k";
    if (longEdge <= 2048) return "t2k";
    return "t4k";
}

/** 从 quality/size 字符串归档（"1k"/"low"/"3840x2160"/"2048x2048"）。无法识别时回落 t1k。 */
export function resolveSizeTierFromInput(input: string | undefined): SizeTier {
    const value = (input || "").trim().toLowerCase();
    if (!value) return "t1k";
    const dim = value.match(/^(\d+)\s*x\s*(\d+)$/);
    if (dim) return resolveSizeTier(Number(dim[1]), Number(dim[2]));
    return QUALITY_TIER[value] ?? "t1k";
}
