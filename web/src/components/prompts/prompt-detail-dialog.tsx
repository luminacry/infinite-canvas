"use client";

import { Copy, FolderPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPromptDate, type Prompt } from "@/services/api/prompts";

export function PromptDetailDialog({ prompt, onClose, onCopy, onSaveAsset }: { prompt: Prompt | null; onClose: () => void; onCopy: (prompt: string) => void; onSaveAsset?: (prompt: Prompt) => void }) {
    return (
        <Dialog open={Boolean(prompt)} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl">
                {prompt ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{prompt.title}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
                            <div className="space-y-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={prompt.coverUrl} alt={prompt.title} className="aspect-[4/3] w-full rounded-lg object-cover" />
                                {prompt.preview ? <pre className="bg-muted text-muted-foreground max-h-60 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-xs leading-5">{prompt.preview}</pre> : null}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap gap-1.5">
                                    {prompt.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="font-normal">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-foreground/90 mt-4 whitespace-pre-wrap text-sm leading-7">{prompt.prompt}</p>
                                <div className="text-muted-foreground mt-4 text-xs">
                                    创建：{formatPromptDate(prompt.createdAt)} · 更新：{formatPromptDate(prompt.updatedAt)}
                                </div>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    <Button onClick={() => onCopy(prompt.prompt)}>
                                        <Copy className="size-4" />
                                        复制提示词
                                    </Button>
                                    {onSaveAsset ? (
                                        <Button variant="outline" onClick={() => onSaveAsset(prompt)}>
                                            <FolderPlus className="size-4" />
                                            加入我的素材
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
