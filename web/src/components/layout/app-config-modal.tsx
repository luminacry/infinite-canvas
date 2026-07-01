"use client";

import { CircleAlert, Cloud, RefreshCw, Wifi } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ModelPicker } from "@/components/model-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { syncAppDataToWebdav, type AppSyncDomainKey, type AppSyncProgressEvent } from "@/services/app-sync";
import { testWebdavConnection, WEBDAV_MANIFEST_FILE_NAME } from "@/services/webdav-sync";
import { audioFormatOptions, audioVoiceOptions, normalizeAudioSpeedValue } from "@/lib/audio-generation";
import { modelOptionLabel, normalizeModelOptionValue, useConfigStore, type ModelCapability } from "@/stores/use-config-store";

type ModelGroup = {
    capability: ModelCapability;
    modelKey: "imageModel" | "videoModel" | "textModel" | "audioModel";
    modelsKey: "imageModels" | "videoModels" | "textModels" | "audioModels";
    defaultLabel: string;
    optionsLabel: string;
};

type WebdavDomainProgress = { label: string; stage: string; current?: number; total?: number; status?: "active" | "success" | "exception" };

const modelGroups: ModelGroup[] = [
    { capability: "image", modelKey: "imageModel", modelsKey: "imageModels", defaultLabel: "默认生图模型", optionsLabel: "生图模型可选项" },
    { capability: "video", modelKey: "videoModel", modelsKey: "videoModels", defaultLabel: "默认视频模型", optionsLabel: "视频模型可选项" },
    { capability: "text", modelKey: "textModel", modelsKey: "textModels", defaultLabel: "默认文本模型", optionsLabel: "文本模型可选项" },
    { capability: "audio", modelKey: "audioModel", modelsKey: "audioModels", defaultLabel: "默认音频模型", optionsLabel: "音频模型可选项" },
];

const webdavDomainKeys: AppSyncDomainKey[] = ["canvas", "assets", "image-workbench", "video-workbench"];
const webdavDomainLabels: Record<AppSyncDomainKey, string> = { canvas: "画布", assets: "我的素材", "image-workbench": "生图工作台", "video-workbench": "视频创作台" };

function createWebdavDomainProgress(): Record<AppSyncDomainKey, WebdavDomainProgress> {
    return webdavDomainKeys.reduce((progress, key) => ({ ...progress, [key]: { label: webdavDomainLabels[key], stage: "等待同步" } }), {} as Record<AppSyncDomainKey, WebdavDomainProgress>);
}

// PLACEHOLDER_BODY

export function AppConfigModal() {
    const [testingWebdav, setTestingWebdav] = useState(false);
    const [syncingWebdav, setSyncingWebdav] = useState(false);
    const [webdavSyncStatus, setWebdavSyncStatus] = useState("");
    const [webdavDomainProgress, setWebdavDomainProgress] = useState(createWebdavDomainProgress);
    const config = useConfigStore((state) => state.config);
    const webdav = useConfigStore((state) => state.webdav);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const updateWebdavConfig = useConfigStore((state) => state.updateWebdavConfig);
    const isConfigOpen = useConfigStore((state) => state.isConfigOpen);
    const shouldPromptContinue = useConfigStore((state) => state.shouldPromptContinue);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    const clearPromptContinue = useConfigStore((state) => state.clearPromptContinue);
    const webdavReady = Boolean(webdav.url.trim());

    const finishConfig = () => {
        setConfigDialogOpen(false);
        toast.success(shouldPromptContinue ? "配置已保存，请继续刚才的请求" : "配置已保存");
        clearPromptContinue();
    };

    // 平台模型：点选可选项（toggle 一个模型进/出该能力的可选列表）
    const toggleCapabilityModel = (group: ModelGroup, model: string) => {
        const normalized = normalizeModelOptionValue(model, config.channels);
        const current = config[group.modelsKey];
        const next = current.includes(normalized) ? current.filter((m) => m !== normalized) : [...current, normalized];
        updateConfig(group.modelsKey, next);
        if (!next.includes(config[group.modelKey])) updateConfig(group.modelKey, next[0] || "");
    };

    const testWebdav = async () => {
        if (!webdavReady) return toast.error("请先填写 WebDAV 地址");
        setTestingWebdav(true);
        try {
            await testWebdavConnection(webdav);
            toast.success("WebDAV 连接可用");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "WebDAV 连接测试失败");
        } finally {
            setTestingWebdav(false);
        }
    };

    const updateWebdavProgress = (event: AppSyncProgressEvent) => {
        setWebdavSyncStatus(event.stage);
        if (!event.domain) return;
        setWebdavDomainProgress((current) => ({
            ...current,
            [event.domain as AppSyncDomainKey]: { label: event.label || webdavDomainLabels[event.domain as AppSyncDomainKey], stage: event.stage, current: event.current, total: event.total, status: event.status },
        }));
    };

    const syncWebdav = async () => {
        if (!webdavReady) return toast.error("请先填写 WebDAV 地址");
        setSyncingWebdav(true);
        setWebdavDomainProgress(createWebdavDomainProgress());
        setWebdavSyncStatus("准备同步");
        try {
            const result = await syncAppDataToWebdav(webdav, updateWebdavProgress);
            updateWebdavConfig("lastSyncedAt", result.syncedAt);
            toast.success(`同步完成：${result.projects} 个画布，${result.assets} 个素材，${result.imageLogs + result.videoLogs} 条记录，本次上传 ${result.uploadedFiles} 个文件 ${formatBytes(result.uploadedBytes)}`);
        } catch (error) {
            setWebdavSyncStatus(error instanceof Error ? error.message : "WebDAV 同步失败");
            toast.error(error instanceof Error ? error.message : "WebDAV 同步失败");
        } finally {
            setSyncingWebdav(false);
        }
    };

    return (
        <Dialog open={isConfigOpen} onOpenChange={setConfigDialogOpen}>
            <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle>配置与用户偏好</DialogTitle>
                    <p className="text-muted-foreground text-xs">模型选择、生成偏好和同步设置</p>
                </DialogHeader>
                <Tabs defaultValue="models" className="min-h-0">
                    <TabsList>
                        <TabsTrigger value="models">模型</TabsTrigger>
                        <TabsTrigger value="preferences">生成偏好</TabsTrigger>
                        <TabsTrigger value="webdav">WebDAV</TabsTrigger>
                    </TabsList>
                    <div className="max-h-[56vh] overflow-y-auto pr-1">
                        {/* MODELS_TAB */}
                        <TabsContent value="models" className="mt-4 animate-in fade-in duration-200">
                            <div className="bg-muted/40 mb-4 flex gap-2 rounded-lg border p-3">
                                <CircleAlert className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                <div className="text-muted-foreground text-xs leading-5">AI 能力由平台提供，无需配置 API Key；可选模型来自平台开通的渠道，用尽算力点请到个人中心兑换充值。</div>
                            </div>
                            <div className="space-y-5">
                                {modelGroups.map((group) => (
                                    <div key={group.modelsKey} className="space-y-2">
                                        <Label>{group.optionsLabel}</Label>
                                        {config.models.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {config.models.map((model) => {
                                                    const active = config[group.modelsKey].includes(model);
                                                    return (
                                                        <button key={model} type="button" onClick={() => toggleCapabilityModel(group, model)}>
                                                            <Badge variant={active ? "default" : "outline"} className={cn("cursor-pointer transition-colors", !active && "hover:bg-accent")}>
                                                                {modelOptionLabel(config, model)}
                                                            </Badge>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-xs">暂无可用模型，请联系管理员开通</p>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">{group.defaultLabel}：</span>
                                            <ModelPicker config={config} value={config[group.modelKey]} onChange={(model) => updateConfig(group.modelKey, model)} capability={group.capability} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                        {/* PREF_TAB */}
                        <TabsContent value="preferences" className="mt-4 animate-in fade-in duration-200">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label>画布默认生图张数</Label>
                                    <Input type="number" min={1} max={15} value={config.canvasImageCount} onChange={(e) => updateConfig("canvasImageCount", e.target.value)} onBlur={(e) => updateConfig("canvasImageCount", normalizeImageCount(e.target.value))} />
                                    <span className="text-muted-foreground text-xs">新建画布生图和配置节点默认使用，单个节点仍可覆盖。</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>默认音频声音</Label>
                                    <Select value={config.audioVoice} onValueChange={(v) => updateConfig("audioVoice", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{audioVoiceOptions.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>默认音频格式</Label>
                                    <Select value={config.audioFormat} onValueChange={(v) => updateConfig("audioFormat", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{audioFormatOptions.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>默认音频语速</Label>
                                    <Input type="number" min={0.25} max={4} step={0.05} value={config.audioSpeed} onChange={(e) => updateConfig("audioSpeed", e.target.value)} onBlur={(e) => updateConfig("audioSpeed", normalizeAudioSpeedValue(e.target.value))} />
                                </div>
                            </div>
                            <div className="mt-4 flex flex-col gap-1.5">
                                <Label>默认音频指令</Label>
                                <Textarea rows={2} value={config.audioInstructions} placeholder="例如：自然、温暖、适合旁白。" onChange={(e) => updateConfig("audioInstructions", e.target.value)} />
                            </div>
                            <div className="mt-4 flex flex-col gap-1.5">
                                <Label>系统提示词</Label>
                                <Textarea rows={4} value={config.systemPrompt} placeholder="例如：你是一位擅长电影感写实摄影的视觉导演。" onChange={(e) => updateConfig("systemPrompt", e.target.value)} />
                            </div>
                        </TabsContent>
                        {/* WEBDAV_TAB */}
                        <TabsContent value="webdav" className="mt-4 animate-in fade-in duration-200">
                            <section className="rounded-lg border p-3">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <Cloud className="size-4" />
                                            WebDAV 同步
                                        </div>
                                        <div className="text-muted-foreground mt-1 text-xs">同步画布、我的素材、生成记录和本地媒体文件，不包含 AI API Key；服务不支持 CORS 时可走 Next.js 转发。</div>
                                    </div>
                                    <div className="text-muted-foreground text-xs">{webdav.lastSyncedAt ? `上次同步 ${formatWebdavTime(webdav.lastSyncedAt)}` : "尚未同步"}</div>
                                </div>
                                <div className="mb-4 flex flex-col gap-1.5">
                                    <Label>连接方式</Label>
                                    <div className="bg-muted inline-flex rounded-md p-0.5">
                                        {([["direct", "前端直连"], ["nextjs", "Next.js 转发"]] as const).map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => updateWebdavConfig("proxyMode", value)}
                                                className={cn("flex-1 rounded px-4 py-1.5 text-sm font-medium transition-colors", webdav.proxyMode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <Label>WebDAV 地址</Label>
                                        <Input value={webdav.url} placeholder="https://nas.example.com/webdav" onChange={(e) => updateWebdavConfig("url", e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <Label>远程目录</Label>
                                        <Input value={webdav.directory} placeholder="infinite-canvas" onChange={(e) => updateWebdavConfig("directory", e.target.value)} />
                                        <span className="text-muted-foreground text-xs">会在该目录下分业务目录保存，每个目录包含 {WEBDAV_MANIFEST_FILE_NAME} 和 files/</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>用户名</Label>
                                        <Input value={webdav.username} autoComplete="username" onChange={(e) => updateWebdavConfig("username", e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>密码 / 应用密码</Label>
                                        <Input type="password" value={webdav.password} autoComplete="current-password" onChange={(e) => updateWebdavConfig("password", e.target.value)} />
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Button variant="outline" disabled={!webdavReady || syncingWebdav || testingWebdav} onClick={() => void testWebdav()}>
                                        <Wifi className="size-4" />
                                        {testingWebdav ? "测试中" : "测试连接"}
                                    </Button>
                                    <Button disabled={!webdavReady || testingWebdav || syncingWebdav} onClick={() => void syncWebdav()}>
                                        <RefreshCw className={cn("size-4", syncingWebdav && "animate-spin")} />
                                        {syncingWebdav ? "同步中" : "立即同步"}
                                    </Button>
                                    {webdavSyncStatus ? <span className="text-muted-foreground text-xs">{webdavSyncStatus}</span> : null}
                                </div>
                                {syncingWebdav || webdavSyncStatus ? <WebdavProgressGrid progress={webdavDomainProgress} /> : null}
                            </section>
                        </TabsContent>
                    </div>
                </Tabs>
                <DialogFooter>
                    <Button onClick={finishConfig}>完成</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// PLACEHOLDER_HELPERS

function normalizeImageCount(value: string) {
    return String(Math.max(1, Math.min(15, Math.floor(Math.abs(Number(value)) || 3))));
}

function formatWebdavTime(value: string) {
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function WebdavProgressGrid({ progress }: { progress: Record<AppSyncDomainKey, WebdavDomainProgress> }) {
    return (
        <div className="mt-3 grid gap-2">
            {webdavDomainKeys.map((key) => {
                const item = progress[key];
                const count = item.total ? `${item.current || 0}/${item.total}` : "";
                return (
                    <div key={key} className="rounded-md border px-3 py-2">
                        <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-xs">
                            <span className="text-foreground shrink-0 font-medium">{item.label}</span>
                            <span className="text-muted-foreground min-w-0 truncate text-right">
                                {item.stage}
                                {count ? ` · ${count}` : ""}
                            </span>
                        </div>
                        <Progress value={getWebdavProgressPercent(item)} status={getWebdavProgressStatus(item)} />
                    </div>
                );
            })}
        </div>
    );
}

function getWebdavProgressPercent(item: WebdavDomainProgress) {
    if (item.status === "success") return 100;
    if (item.total) return Math.min(100, Math.round(((item.current || 0) / item.total) * 100));
    if (item.status === "exception") return 100;
    if (item.stage === "等待同步") return 0;
    if (item.stage === "读取远端清单") return 12;
    if (item.stage === "读取本地数据") return 24;
    if (item.stage === "下载缺失媒体") return 36;
    if (item.stage === "写入本地合并结果") return 58;
    if (item.stage === "上传新增媒体") return 66;
    if (item.stage === "媒体已齐全" || item.stage === "媒体无需上传") return 74;
    if (item.stage.startsWith("上传清单")) return 90;
    return item.status === "active" ? 30 : 0;
}

function getWebdavProgressStatus(item: WebdavDomainProgress): "normal" | "active" | "success" | "exception" {
    if (item.status === "success" || item.status === "exception") return item.status;
    return item.status === "active" ? "active" : "normal";
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

