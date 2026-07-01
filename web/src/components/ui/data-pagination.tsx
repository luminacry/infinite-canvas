"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** 轻量分页条：上一页/下一页 + 页码信息。用于后台表格。 */
export function DataPagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return (
        <div className="text-muted-foreground flex items-center justify-end gap-2 pt-4 text-sm">
            <span>
                共 {total} 条 · 第 {page}/{totalPages} 页
            </span>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                <ChevronRight className="size-4" />
            </Button>
        </div>
    );
}
