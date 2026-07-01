"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fetchPrompts, type Prompt } from "@/services/api/prompts";
import { navigationTools } from "@/constant/navigation-tools";
import { cn } from "@/lib/utils";

function Highlighter({ action, color, children }: { action: "highlight" | "underline"; color: string; children: ReactNode }) {
    return (
        <span className="relative inline-block px-1">
            {action === "highlight" ? (
                <span className="absolute inset-x-0 bottom-0 top-1 rounded-sm opacity-45" style={{ backgroundColor: color }} />
            ) : (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-full opacity-80" style={{ backgroundColor: color }} />
            )}
            <span className="relative font-medium text-stone-800 dark:text-stone-200">{children}</span>
        </span>
    );
}

export default function IndexPage() {
    const [primaryTool] = navigationTools;
    const [promptShowcase, setPromptShowcase] = useState<Prompt[]>([]);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    useEffect(() => {
        void fetchPrompts({ pageSize: 12 })
            .then((data) => setPromptShowcase(data.items))
            .catch((error) => toast.error(error instanceof Error ? error.message : "获取提示词失败"));
    }, []);

    const preview = previewIndex !== null ? promptShowcase[previewIndex] : null;
    const move = (delta: number) => setPreviewIndex((i) => (i === null ? i : (i + delta + promptShowcase.length) % promptShowcase.length));

    return (
        <main className="bg-background relative h-full overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] text-stone-950 [background-size:16px_16px] dark:bg-[radial-gradient(rgba(245,245,244,.18)_1px,transparent_1px)] dark:text-stone-100">
            <section className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden px-6">
                <div className="pointer-events-none absolute left-[15%] top-24 size-20 rounded-full border border-dashed border-stone-200 dark:border-stone-800" />
                <div className="pointer-events-none absolute right-[23%] top-[48%] size-20 rounded-full border border-dashed border-stone-200 dark:border-stone-800" />

                <div className="relative flex min-h-[620px] flex-col items-center justify-center pt-10 text-center">
                    <h1 className="ai-title-aurora max-w-5xl text-balance text-5xl font-semibold tracking-normal sm:text-7xl lg:text-8xl">无限画布</h1>
                    <p className="mt-8 max-w-3xl text-balance text-lg leading-8 text-stone-500 dark:text-stone-400">
                        在
                        <Highlighter action="underline" color="#FF9800">无限画布</Highlighter>
                        中生成、连接和重组
                        <Highlighter action="highlight" color="#87CEFA">图片、文字与图形</Highlighter>
                        ，让创作从单次生成变成连续推演。
                    </p>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Button size="lg" asChild>
                            <Link href={`/${primaryTool.slug}`}>
                                开始使用
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/canvas">打开画布</Link>
                        </Button>
                    </div>
                </div>

                <section className="relative mx-auto mb-20 max-w-6xl border-t border-stone-200 pt-12 dark:border-stone-800">
                    <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
                        <div />
                        <div className="max-w-2xl text-center">
                            <h2 className="text-3xl font-semibold">沉淀每一次好结果</h2>
                            <p className="text-muted-foreground mt-3 text-base leading-7">收藏稳定出图的提示词、参考风格和结果图片，让下一次创作从已有经验开始。</p>
                        </div>
                        <Button variant="link" asChild className="justify-self-center md:justify-self-end">
                            <Link href="/prompts">
                                查看提示词库
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="grid auto-rows-[210px] gap-4 md:grid-cols-4">
                        {promptShowcase.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setPreviewIndex(index)}
                                className={cn(
                                    "group relative cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-stone-100 text-left dark:border-stone-800 dark:bg-stone-900",
                                    index === 0 && "md:col-span-2 md:row-span-2",
                                    index === 3 && "md:col-span-2",
                                )}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-4 text-white">
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {item.tags.slice(0, 2).map((tag) => (
                                            <Badge key={tag} className="border-0 bg-white/15 text-[11px] font-normal text-white backdrop-blur">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <h3 className="text-sm font-medium">{item.title}</h3>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">{item.prompt}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </section>

            <Dialog open={previewIndex !== null} onOpenChange={(o) => !o && setPreviewIndex(null)}>
                <DialogContent className="max-w-4xl">
                    {preview ? (
                        <div className="flex flex-col items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview.coverUrl} alt={preview.title} className="max-h-[70vh] w-auto rounded" />
                            <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                <Button variant="ghost" size="icon" onClick={() => move(-1)}><ChevronLeft className="size-5" /></Button>
                                <span className="text-foreground">{preview.title}</span>
                                <Button variant="ghost" size="icon" onClick={() => move(1)}><ChevronRight className="size-5" /></Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </main>
    );
}
