"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** 轻量进度条（值 0-100）。状态色：normal/active(蓝)/success(绿)/exception(红)。 */
function Progress({ value = 0, status = "normal", className }: { value?: number; status?: "normal" | "active" | "success" | "exception"; className?: string }) {
    const color = status === "success" ? "bg-green-500" : status === "exception" ? "bg-red-500" : "bg-primary";
    return (
        <div className={cn("bg-muted relative h-1.5 w-full overflow-hidden rounded-full", className)}>
            <div className={cn("h-full rounded-full transition-all", color, status === "active" && "animate-pulse")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

export { Progress };
