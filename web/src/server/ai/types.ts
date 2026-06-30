// 上游渠道适配器的统一接口。代理层只认这套类型，屏蔽各家差异。
export type UpstreamChannel = { type: string; baseUrl: string; apiKey: string };

export type ImageGenInput = {
    model: string; // 上游模型名
    prompt: string;
    size?: string; // 如 "1024x1024"，可空
    quality?: string; // 1k/2k/4k 已在上层归档，这里透传上游可识别的 quality
    count: number;
};

export type GeneratedImage = { buffer: Buffer; mimeType: string };
export type ImageGenResult = { images: GeneratedImage[]; upstreamId?: string };
