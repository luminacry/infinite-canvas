"use client";

import { Check, Loader2, Search } from "lucide-react";
import { type UIEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ALL_PROMPTS_OPTION } from "@/services/api/prompts";
import { cn } from "@/lib/utils";
import { PromptCard } from "./prompt-card";
import { usePromptList } from "./use-prompt-list";

export function PromptSelectDialog({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (prompt: string) => void }) {
    const [keyword, setKeyword] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(ALL_PROMPTS_OPTION);
    const { query, items, tags: promptTags, categories: promptCategories } = usePromptList({ keyword, tags: selectedTags, category: selectedCategory, enabled: open });
    const toggleTag = (tag: string) => {
        if (tag === ALL_PROMPTS_OPTION) return setSelectedTags([]);
        setSelectedTags((items) => (items.includes(tag) ? items.filter((item) => item !== tag) : [...items, tag]));
    };
    const selectPrompt = (prompt: string) => {
        onSelect(prompt);
        onOpenChange(false);
    };

    useEffect(() => {
        if (query.isError) toast.error(query.error instanceof Error ? query.error.message : "获取提示词失败");
    }, [query.error, query.isError]);

    const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        if (query.hasNextPage && !query.isFetchingNextPage && target.scrollTop + target.clientHeight >= target.scrollHeight - 160) void query.fetchNextPage();
    };

    const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
        <button type="button" onClick={onClick}>
            <Badge variant={active ? "default" : "outline"} className={cn("cursor-pointer transition-colors", !active && "hover:bg-accent")}>
                {label}
            </Badge>
        </button>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle>提示词库</DialogTitle>
                </DialogHeader>
                <div data-canvas-no-zoom onWheelCapture={(event) => event.stopPropagation()}>
                    <div className="mx-auto max-w-2xl">
                        <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按标题查询" className="pl-9" />
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3">
                        <div className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-start">
                            <div className="text-muted-foreground pt-1 text-xs font-medium">分类</div>
                            <div className="flex flex-wrap gap-2">
                                {promptCategories.map((category) => (
                                    <FilterChip key={category} label={category} active={selectedCategory === category} onClick={() => setSelectedCategory(category)} />
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-start">
                            <div className="text-muted-foreground pt-1 text-xs font-medium">标签</div>
                            <div className="flex flex-wrap gap-2">
                                {promptTags.map((tag) => {
                                    const active = tag === ALL_PROMPTS_OPTION ? selectedTags.length === 0 : selectedTags.includes(tag);
                                    return <FilterChip key={tag} label={tag} active={active} onClick={() => toggleTag(tag)} />;
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="thin-scrollbar mt-6 max-h-[520px] overflow-y-auto pr-2" data-canvas-no-zoom onScroll={handleListScroll} onWheelCapture={(event) => event.stopPropagation()}>
                        {query.isLoading ? (
                            <div className="flex h-40 items-center justify-center">
                                <Loader2 className="text-muted-foreground size-5 animate-spin" />
                            </div>
                        ) : null}
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((item) => (
                                <PromptCard key={item.id} item={item} onOpen={() => selectPrompt(item.prompt)} onCopy={() => selectPrompt(item.prompt)} actionLabel="使用此提示词" actionIcon={<Check className="size-3.5" />} actionType="default" />
                            ))}
                        </div>
                        {!query.isLoading && items.length === 0 ? <div className="text-muted-foreground py-8 text-center text-sm">没有找到匹配的提示词</div> : null}
                        {query.isFetchingNextPage ? (
                            <div className="py-4 text-center">
                                <Loader2 className="text-muted-foreground mx-auto size-4 animate-spin" />
                            </div>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
