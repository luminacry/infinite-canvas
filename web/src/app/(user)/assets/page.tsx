"use client";

import { Copy, Download, PencilLine, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCopyText } from "@/hooks/use-copy-text";
import { formatBytes, readFileAsDataUrl } from "@/lib/image-utils";
import { uploadImage } from "@/services/image-storage";
import { cn } from "@/lib/utils";
import { useAssetStore, type Asset, type AssetKind, type ImageAsset } from "@/stores/use-asset-store";
import { exportAssets, readAssetPackage } from "./asset-transfer";

type ImageDraft = ImageAsset["data"] | null;
type FormState = { kind: AssetKind; title: string; coverUrl: string; tags: string[]; source: string; note: string; content: string };
const EMPTY_FORM: FormState = { kind: "text", title: "", coverUrl: "", tags: [], source: "手动添加", note: "", content: "" };

const kindOptions = [
    { label: "全部", value: "all" },
    { label: "文本", value: "text" },
    { label: "图片", value: "image" },
    { label: "视频", value: "video" },
];

export default function AssetsPage() {
    const copyText = useCopyText();
    const coverInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const assetInputRef = useRef<HTMLInputElement>(null);
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const removeAsset = useAssetStore((state) => state.removeAsset);
    const [keyword, setKeyword] = useState("");
    const [kindFilter, setKindFilter] = useState<AssetKind | "all">("all");
    const [page, setPage] = useState(1);
    const pageSize = 12;
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isAssetOpen, setIsAssetOpen] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
    const [imageDraft, setImageDraft] = useState<ImageDraft>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [tagInput, setTagInput] = useState("");

    const validAssets = useMemo(() => assets.filter((a) => a.kind === "text" || a.kind === "image" || a.kind === "video"), [assets]);
    const filteredAssets = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return validAssets.filter((asset) => {
            if (kindFilter !== "all" && asset.kind !== kindFilter) return false;
            if (!query) return true;
            return assetSearchText(asset).includes(query);
        });
    }, [validAssets, keyword, kindFilter]);
    const visibleAssets = useMemo(() => filteredAssets.slice((page - 1) * pageSize, page * pageSize), [filteredAssets, page]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
        setPage((v) => Math.min(v, maxPage));
    }, [filteredAssets.length]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

    const openCreate = () => {
        setEditingAsset(null);
        setImageDraft(null);
        setForm(EMPTY_FORM);
        setIsAssetOpen(true);
    };
    const openEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setImageDraft(asset.kind === "image" ? asset.data : null);
        setForm({ kind: asset.kind, title: asset.title, coverUrl: asset.coverUrl, tags: asset.tags || [], source: asset.source || "", note: asset.note || "", content: asset.kind === "text" ? asset.data.content : "" });
        setIsAssetOpen(true);
    };

    const saveAsset = () => {
        if (!form.title.trim()) return toast.error("请输入标题");
        const base = {
            title: form.title.trim(),
            coverUrl: form.coverUrl?.trim() || (form.kind === "image" && imageDraft ? imageDraft.dataUrl : ""),
            tags: form.tags,
            source: form.source?.trim(),
            note: form.note?.trim(),
            metadata: editingAsset?.metadata || { source: "manual" as const },
        };
        if (form.kind === "text") {
            if (!form.content.trim()) return toast.error("请输入文本内容");
            const asset = { ...base, kind: "text" as const, data: { content: form.content.trim() } };
            editingAsset ? updateAsset(editingAsset.id, asset) : addAsset(asset);
        } else {
            if (!imageDraft) return toast.error("请选择图片文件");
            const asset = { ...base, kind: "image" as const, data: imageDraft };
            editingAsset ? updateAsset(editingAsset.id, asset) : addAsset(asset);
        }
        toast.success(editingAsset ? "素材已更新" : "素材已保存");
        setIsAssetOpen(false);
    };

    const readCoverFile = async (file?: File) => {
        if (!file) return;
        set("coverUrl", await readFileAsDataUrl(file));
    };
    const readImageFile = async (file?: File) => {
        if (!file || !file.type.startsWith("image/")) return;
        const image = await uploadImage(file);
        const draft = { dataUrl: image.url, storageKey: image.storageKey, width: image.width, height: image.height, bytes: image.bytes, mimeType: image.mimeType };
        setImageDraft(draft);
        setForm((f) => ({ ...f, coverUrl: f.coverUrl || draft.dataUrl, title: f.title || file.name }));
    };
    const addTag = (raw: string) => {
        const parts = raw.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
        if (parts.length) setForm((f) => ({ ...f, tags: [...new Set([...f.tags, ...parts])] }));
        setTagInput("");
    };

    const copyAssetText = (asset: Asset) => {
        if (asset.kind === "text") copyText(asset.data.content, "文本已复制");
    };
    const downloadImage = (asset: Asset) => {
        if (asset.kind !== "image" && asset.kind !== "video") return;
        saveAs(asset.kind === "video" ? asset.data.url : asset.data.dataUrl, `${asset.title || "asset"}.${asset.data.mimeType.split("/")[1] || "png"}`);
    };
    const exportAllAssets = async () => {
        if (!validAssets.length) return toast.warning("暂无素材可导出");
        await exportAssets(validAssets);
    };
    const importAssetZip = async (file?: File) => {
        if (!file) return;
        try {
            const imported = await readAssetPackage(file);
            imported.forEach((asset) => {
                const payload = { ...asset } as Record<string, unknown>;
                delete payload.id; delete payload.createdAt; delete payload.updatedAt;
                addAsset(payload as Parameters<typeof addAsset>[0]);
            });
            toast.success(`已导入 ${imported.length} 个素材`);
        } catch {
            toast.error("导入失败，请选择有效的素材压缩包");
        } finally {
            if (assetInputRef.current) assetInputRef.current.value = "";
        }
    };
    const confirmDelete = () => {
        if (!deletingAsset) return;
        removeAsset(deletingAsset.id);
        toast.success("素材已删除");
        setDeletingAsset(null);
    };

    const kindLabel = (k: AssetKind) => (k === "image" ? "图片" : k === "video" ? "视频" : "文本");

    return (
        <div className="bg-background flex h-full flex-col overflow-hidden text-stone-900 dark:text-stone-100">
            <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] px-6 py-8 [background-size:16px_16px] dark:bg-[radial-gradient(rgba(245,245,244,.14)_1px,transparent_1px)]">
                <div className="pb-8">
                    <div className="mx-auto max-w-5xl text-center">
                        <h1 className="text-4xl font-semibold tracking-tight">我的素材</h1>
                        <p className="text-muted-foreground mt-3 text-sm">收藏常用文本和图片，按类型、标题和标签快速查找。</p>
                    </div>
                    <div className="mx-auto mt-8 w-full max-w-2xl">
                        <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input className="w-full pl-9" value={keyword} placeholder="搜索标题、内容、标签或来源" onChange={(e) => { setPage(1); setKeyword(e.target.value); }} />
                        </div>
                    </div>
                    <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-medium">类型</span>
                            <div className="flex flex-wrap gap-2">
                                {kindOptions.map((option) => (
                                    <button key={option.value} type="button" onClick={() => { setPage(1); setKindFilter(option.value as AssetKind | "all"); }}>
                                        <Badge variant={kindFilter === option.value ? "default" : "outline"} className={cn("cursor-pointer transition-colors", kindFilter !== option.value && "hover:bg-accent")}>{option.label}</Badge>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" onClick={() => void exportAllAssets()}>导出素材</Button>
                            <Button variant="ghost" size="sm" onClick={() => assetInputRef.current?.click()}>导入素材</Button>
                            <Button size="sm" onClick={openCreate}>新增素材</Button>
                        </div>
                    </div>
                </div>

                <div className="mx-auto flex max-w-7xl flex-col gap-5">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {visibleAssets.map((asset) => (
                            <AssetCard key={asset.id} asset={asset} kindLabel={kindLabel} onOpen={() => setPreviewAsset(asset)} onEdit={() => openEdit(asset)} onCopy={copyAssetText} onDownload={downloadImage} onDelete={() => setDeletingAsset(asset)} />
                        ))}
                    </div>
                    {!visibleAssets.length ? <div className="text-muted-foreground py-20 text-center text-sm">没有找到素材</div> : null}
                    <DataPagination page={page} pageSize={pageSize} total={filteredAssets.length} onChange={setPage} />
                </div>
            </main>

            {/* 新增/编辑弹窗 */}
            <Dialog open={isAssetOpen} onOpenChange={setIsAssetOpen}>
                <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingAsset ? "编辑素材" : "新增素材"}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>类型</Label>
                            <Select value={form.kind === "video" ? "text" : form.kind} onValueChange={(v) => set("kind", v as AssetKind)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="text">文本</SelectItem><SelectItem value="image">图片</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>标题</Label>
                            <Input placeholder="给素材起一个容易检索的名字" value={form.title} onChange={(e) => set("title", e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>封面 URL</Label>
                            <div className="flex gap-2">
                                <Input placeholder="可粘贴图片 URL，也可上传本地封面" value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} />
                                <Button variant="outline" onClick={() => coverInputRef.current?.click()}><Upload className="size-3.5" />上传</Button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>标签</Label>
                            <Input placeholder="输入标签后回车（逗号分隔）" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(tagInput))} />
                            {form.tags.length ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {form.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => set("tags", form.tags.filter((t) => t !== tag))}>{tag} ✕</Badge>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5"><Label>来源</Label><Input placeholder="手动添加 / 画布 / 提示词库" value={form.source} onChange={(e) => set("source", e.target.value)} /></div>
                            <div className="flex flex-col gap-1.5"><Label>备注</Label><Input placeholder="可选" value={form.note} onChange={(e) => set("note", e.target.value)} /></div>
                        </div>
                        {form.kind === "text" ? (
                            <div className="flex flex-col gap-1.5">
                                <Label>文本内容</Label>
                                <Textarea rows={8} placeholder="保存提示词、说明文案、参考描述等文本素材" value={form.content} onChange={(e) => set("content", e.target.value)} />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <Label>图片内容</Label>
                                <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
                                    <Button variant="outline" onClick={() => imageInputRef.current?.click()}><Upload className="size-4" />选择图片文件</Button>
                                    <span className="text-muted-foreground text-xs">{imageDraft ? `${imageDraft.width}x${imageDraft.height} · ${formatBytes(imageDraft.bytes)}` : "未选择图片"}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssetOpen(false)}>取消</Button>
                        <Button onClick={saveAsset}>保存</Button>
                    </DialogFooter>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void readCoverFile(e.target.files?.[0]); e.target.value = ""; }} />
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void readImageFile(e.target.files?.[0]); e.target.value = ""; }} />
                </DialogContent>
            </Dialog>

            <AssetDrawer asset={previewAsset} kindLabel={kindLabel} onClose={() => setPreviewAsset(null)} onCopy={copyAssetText} onDownload={downloadImage} />
            <input ref={assetInputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(e) => void importAssetZip(e.target.files?.[0])} />

            <Dialog open={Boolean(deletingAsset)} onOpenChange={(o) => !o && setDeletingAsset(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>删除素材</DialogTitle></DialogHeader>
                    <p className="text-sm">确定删除「{deletingAsset?.title}」吗？删除后会从我的素材中移除。</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingAsset(null)}>取消</Button>
                        <Button variant="destructive" onClick={confirmDelete}>删除</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// PLACEHOLDER_VIEW

function AssetCard({ asset, kindLabel, onOpen, onEdit, onCopy, onDownload, onDelete }: { asset: Asset; kindLabel: (k: AssetKind) => string; onOpen: () => void; onEdit: () => void; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void; onDelete: () => void }) {
    const cover = asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "");
    const summary = assetSummary(asset);
    return (
        <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
            <button type="button" className="block w-full text-left" onClick={onOpen}>
                {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={asset.title} className="aspect-[4/3] w-full object-cover" />
                ) : (
                    <div className="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center p-5 text-center text-sm leading-6">{asset.kind === "text" ? asset.data.content : "暂无封面"}</div>
                )}
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="line-clamp-1 text-sm font-semibold">{asset.title}</h2>
                            <span className="text-muted-foreground mt-1 block text-xs">{asset.source || "未标注来源"}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[11px]">{kindLabel(asset.kind)}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-3 text-xs leading-5">{summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {(asset.tags || []).slice(0, 3).map((tag) => <Badge key={tag} variant="outline" className="text-[11px] font-normal">{tag}</Badge>)}
                        {!asset.tags?.length ? <Badge variant="outline" className="text-[11px] font-normal">无标签</Badge> : null}
                    </div>
                </div>
            </button>
            <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                <Button variant="outline" size="sm" onClick={onOpen}>查看</Button>
                {asset.kind !== "video" ? <Button variant="outline" size="sm" onClick={onEdit}><PencilLine className="size-3.5" />编辑</Button> : null}
                {asset.kind === "text" ? <Button variant="outline" size="sm" onClick={() => onCopy(asset)}><Copy className="size-3.5" />复制</Button> : null}
                {asset.kind === "image" || asset.kind === "video" ? <Button variant="outline" size="sm" onClick={() => onDownload(asset)}><Download className="size-3.5" />下载</Button> : null}
                <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="size-3.5" /></Button>
            </div>
        </Card>
    );
}

function AssetDrawer({ asset, kindLabel, onClose, onCopy, onDownload }: { asset: Asset | null; kindLabel: (k: AssetKind) => string; onClose: () => void; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void }) {
    const cover = asset ? asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "") : "";
    return (
        <Sheet open={Boolean(asset)} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader><SheetTitle>素材详情</SheetTitle></SheetHeader>
                {asset ? (
                    <div className="space-y-5">
                        {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={asset.title} className="w-full rounded-lg" />
                        ) : (
                            <div className="bg-muted text-muted-foreground rounded-lg border p-5 text-sm leading-6">{asset.kind === "text" ? asset.data.content : "暂无封面"}</div>
                        )}
                        <div>
                            <h4 className="mb-2 text-lg font-semibold">{asset.title}</h4>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge variant="secondary">{kindLabel(asset.kind)}</Badge>
                                {(asset.tags || []).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                            </div>
                        </div>
                        <div className="rounded-lg border p-4">
                            <span className="text-muted-foreground block text-xs">内容</span>
                            {asset.kind === "text" ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm">{asset.data.content}</p>
                            ) : asset.kind === "video" ? (
                                <video src={asset.data.url} controls className="mt-2 aspect-video w-full rounded-lg bg-black" />
                            ) : (
                                <p className="mt-2 text-sm">{asset.data.width}x{asset.data.height} · {formatBytes(asset.data.bytes)} · {asset.data.mimeType}</p>
                            )}
                        </div>
                        {asset.note ? (
                            <div><span className="text-muted-foreground text-sm">备注</span><p className="mt-1 text-sm">{asset.note}</p></div>
                        ) : null}
                        <div className="flex gap-2">
                            {asset.kind === "text" ? <Button onClick={() => onCopy(asset)}><Copy className="size-4" />复制文本</Button> : null}
                            {asset.kind === "image" || asset.kind === "video" ? <Button onClick={() => onDownload(asset)}><Download className="size-4" />{asset.kind === "video" ? "下载视频" : "下载图片"}</Button> : null}
                        </div>
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

function assetSummary(asset: Asset) {
    if (asset.kind === "text") return asset.data.content;
    return `${asset.data.width}x${asset.data.height} · ${formatBytes(asset.data.bytes)} · ${asset.data.mimeType}`;
}

function assetSearchText(asset: Asset) {
    return [asset.title, asset.source || "", asset.note || "", (asset.tags || []).join(" "), asset.kind === "text" ? asset.data.content : asset.data.mimeType].join(" ").toLowerCase();
}

