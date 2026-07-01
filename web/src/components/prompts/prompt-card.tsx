"use client";

import { Copy } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPromptDate, type Prompt } from "@/services/api/prompts";

export function PromptCard({
    item,
    onOpen,
    onCopy,
    actionLabel = "复制",
    actionIcon = <Copy className="size-3.5" />,
    actionType = "ghost",
    extraAction,
}: {
    item: Prompt;
    onOpen: () => void;
    onCopy: () => void;
    actionLabel?: string;
    actionIcon?: ReactNode;
    actionType?: "ghost" | "default";
    extraAction?: ReactNode;
}) {
    return (
        <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-md">
            <button type="button" className="block w-full text-left" onClick={onOpen}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-1 text-sm font-semibold">{item.title}</h2>
                        <span className="text-muted-foreground shrink-0 text-xs">{formatPromptDate(item.updatedAt)}</span>
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-3 text-xs leading-5">{item.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[11px] font-normal">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            </button>
            <div className="flex items-center gap-2 px-4 pb-4">
                <Button variant={actionType} size="sm" className={actionType === "default" ? "flex-1" : ""} onClick={onCopy}>
                    {actionIcon}
                    {actionLabel}
                </Button>
                {extraAction}
            </div>
        </Card>
    );
}
