"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, type AdminCode } from "@/services/api/admin";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    unused: { label: "未使用", variant: "secondary" },
    used: { label: "已使用", variant: "default" },
    disabled: { label: "已禁用", variant: "outline" },
};

function downloadCsv(batchId: string, codes: string[]) {
    const blob = new Blob([`code\n${codes.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `codes-${batchId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

export default function AdminCodesPage() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [form, setForm] = useState({ credits: 1000, count: 10 });
    const [generated, setGenerated] = useState<{ batchId: string; codes: string[] } | null>(null);
    const { data, isLoading } = useQuery({ queryKey: ["admin-codes", page], queryFn: () => adminApi.codes(page, 20) });

    const onGenerate = async () => {
        try {
            const res = await adminApi.genCodes(form.credits, form.count);
            setGenerated(res);
            qc.invalidateQueries({ queryKey: ["admin-codes"] });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "生成失败");
        }
    };
    const onDisable = async (batchId: string | null) => {
        if (!batchId) return;
        try {
            const res = await adminApi.disableCodes(batchId);
            toast.success(`已禁用 ${res.count} 个未使用码`);
            qc.invalidateQueries({ queryKey: ["admin-codes"] });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="mb-6 text-xl font-semibold">兑换码</h1>
            <Card className="mb-4 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1.5">
                        <Label>面值</Label>
                        <Input type="number" min={1} className="w-32" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>数量</Label>
                        <Input type="number" min={1} max={5000} className="w-32" value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) || 0 })} />
                    </div>
                    <Button onClick={onGenerate}>批量生成</Button>
                </div>
            </Card>
            <Card className="p-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>批次</TableHead>
                            <TableHead>面值</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>兑换人</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">加载中…</TableCell></TableRow>
                        ) : !data?.items.length ? (
                            <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">暂无兑换码</TableCell></TableRow>
                        ) : (
                            data.items.map((r: AdminCode) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs">{r.batchId}</TableCell>
                                    <TableCell>{r.credits}</TableCell>
                                    <TableCell><Badge variant={STATUS[r.status]?.variant ?? "outline"}>{STATUS[r.status]?.label ?? r.status}</Badge></TableCell>
                                    <TableCell className="max-w-[8rem] truncate font-mono text-xs">{r.usedBy || "-"}</TableCell>
                                    <TableCell>{dayjs(r.createdAt).format("YYYY-MM-DD HH:mm")}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="sm" onClick={() => onDisable(r.batchId)}>禁用本批</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <DataPagination page={page} pageSize={20} total={data?.total ?? 0} onChange={setPage} />
            </Card>

            <Dialog open={!!generated} onOpenChange={(o) => !o && setGenerated(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>兑换码已生成（仅此一次可见）</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">批次 {generated?.batchId}，请立即导出保存，关闭后无法再次查看明文。</p>
                    <div className="bg-muted max-h-60 overflow-auto rounded p-3 font-mono text-xs">
                        {generated?.codes.map((c) => <div key={c}>{c}</div>)}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => generated && downloadCsv(generated.batchId, generated.codes)}>下载 CSV</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
