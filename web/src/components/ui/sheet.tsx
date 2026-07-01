"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetContent({ className, children, side = "left", ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "top" | "right" | "bottom" | "left" }) {
    const sideCls =
        side === "left"
            ? "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
            : side === "right"
              ? "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
              : side === "top"
                ? "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top"
                : "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom";
    return (
        <SheetPrimitive.Portal>
            <SheetPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
            <SheetPrimitive.Content
                data-slot="sheet-content"
                className={cn("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300", sideCls, className)}
                {...props}
            >
                {children}
                <SheetPrimitive.Close className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:outline-none">
                    <XIcon className="size-4" />
                    <span className="sr-only">关闭</span>
                </SheetPrimitive.Close>
            </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
    );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
    return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
    return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-foreground font-semibold", className)} {...props} />;
}
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
    return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription };
