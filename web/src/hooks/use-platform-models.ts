"use client";

import { useEffect } from "react";
import { useConfigStore } from "@/stores/use-config-store";

type PlatformModel = { channel: string; model: string; capability: string; tiers: Record<string, number> };

/**
 * 平台托管模式：从 /api/models 拉取可用模型（按能力分组）写入配置 store 的模型列表，
 * 取代 BYOK 的本地渠道模型。用户只看到平台模型（来自“渠道1/渠道2”），不接触 Key/上游。
 */
export function usePlatformModels(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        fetch("/api/models", { credentials: "include" })
            .then((r) => r.json())
            .then((res: { code: number; data: PlatformModel[] }) => {
                if (cancelled || res.code !== 0 || !Array.isArray(res.data)) return;
                const byCap = (cap: string) => res.data.filter((m) => m.capability === cap).map((m) => m.model);
                const image = byCap("image");
                const text = byCap("text");
                const video = byCap("video");
                const audio = byCap("audio");
                const all = [...new Set(res.data.map((m) => m.model))];

                const { updateConfig } = useConfigStore.getState();
                updateConfig("models", all);
                updateConfig("imageModels", image);
                updateConfig("textModels", text);
                updateConfig("videoModels", video);
                updateConfig("audioModels", audio);

                // 选中项回落到可用模型（用裸模型名，与后端 ModelPricing.model 一致）
                const cfg = useConfigStore.getState().config;
                const bare = (m: string) => m.split("::").pop() || m;
                if (image.length && !image.includes(bare(cfg.imageModel))) updateConfig("imageModel", image[0]);
                if (text.length && !text.includes(bare(cfg.textModel))) updateConfig("textModel", text[0]);
                if (video.length && !video.includes(bare(cfg.videoModel))) updateConfig("videoModel", video[0]);
                if (audio.length && !audio.includes(bare(cfg.audioModel))) updateConfig("audioModel", audio[0]);
                if (image.length) updateConfig("model", image[0]);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [enabled]);
}
