"use client";

import type { CSSProperties } from "react";
import { useVersionCheck } from "@/hooks/use-version-check";
import { APP_VERSION } from "@/constant/env";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// 更新类型 → Badge 配色（用 Tailwind 语义色，跟随明暗）
const TYPE_CLASS: Record<string, string> = {
    新增: "bg-green-500/15 text-green-600 dark:text-green-400",
    修复: "bg-red-500/15 text-red-600 dark:text-red-400",
    调整: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    文档: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
};

function getReleaseTitle(version: string) {
    return version === "Unreleased" ? "未发布" : version;
}

type VersionReleaseModalProps = {
    className?: string;
    style?: CSSProperties;
};

export function VersionReleaseModal({ className, style }: VersionReleaseModalProps) {
    const { open, setOpen, openReleaseModal, latestVersion, releases, checking, hasNewVersion, checkLatestRelease } = useVersionCheck();

    return (
        <>
            <button
                type="button"
                className={className || "shrink-0 cursor-pointer text-xs font-medium text-stone-500 transition hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"}
                style={style}
                onClick={openReleaseModal}
                title="查看版本更新"
            >
                <span className="relative inline-flex">
                    {APP_VERSION}
                    {hasNewVersion ? <span className="absolute -right-1.5 -top-1 size-1.5 rounded-full bg-green-500" /> : null}
                </span>
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>版本更新</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3">
                            <div className="text-muted-foreground text-xs">当前版本</div>
                            <div className="mt-1 text-base font-semibold">{APP_VERSION}</div>
                        </div>
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-muted-foreground text-xs">最新版本</div>
                                <button type="button" className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 transition hover:underline" onClick={() => void checkLatestRelease(true)}>
                                    {checking ? "检查中..." : "检查更新"}
                                </button>
                            </div>
                            <div className="mt-1 text-base font-semibold">{latestVersion}</div>
                        </div>
                    </div>
                    <div className="max-h-[56vh] space-y-6 overflow-y-auto pr-2">
                        {releases.map((release) => (
                            <div key={release.version} className="border-border relative border-l pl-5">
                                <span className="bg-primary absolute -left-[5px] top-1.5 size-2.5 rounded-full" />
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold">{getReleaseTitle(release.version)}</span>
                                    <span className="text-muted-foreground text-xs">{release.date}</span>
                                    {release.version === latestVersion ? <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">最新</Badge> : null}
                                    {release.version === APP_VERSION ? <Badge variant="secondary">当前</Badge> : null}
                                </div>
                                <div className="mt-2 space-y-1.5">
                                    {release.items.map((item, index) => (
                                        <div key={`${release.version}-${index}`} className="text-foreground/80 flex items-start gap-2 text-sm leading-6">
                                            <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", TYPE_CLASS[item.type] ?? "bg-muted text-muted-foreground")}>{item.type}</span>
                                            <span className="min-w-0 flex-1">{item.content}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
