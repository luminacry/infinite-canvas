"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, type AdminGeneration } from "@/services/api/admin";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "进行中", variant: "secondary" },
    success: { label: "成功", variant: "default" },
    failed: { label: "失败", variant: "destructive" },
};

export default function AdminGenerationsPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>();
    const [userId, setUserId] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["admin-gen", page, status, userId], queryFn: () => adminApi.generations(page, 20, { status, userId: userId || undefined }) });

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="mb-6 text-xl font-semibold">生成记录</h1>
            <Card className="p-4">
                <div className="mb-4 flex flex-wrap gap-2">
                    <Select value={status ?? "all"} onValueChange={(v) => { setPage(1); setStatus(v === "all" ? undefined : v); }}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="状态" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部状态</SelectItem>
                            <SelectItem value="success">成功</SelectItem>
                            <SelectItem value="failed">失败</SelectItem>
                            <SelectItem value="pending">进行中</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="按用户 ID 搜索" value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage(1)} className="w-64" />
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>用户</TableHead>
                            <TableHead>能力</TableHead>
                            <TableHead>模型</TableHead>
                            <TableHead>档位</TableHead>
                            <TableHead>消耗</TableHead>
                            <TableHead>提示词</TableHead>
                            <TableHead>状态</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">加载中…</TableCell>
                            </TableRow>
                        ) : !data?.items.length ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">暂无数据</TableCell>
                            </TableRow>
                        ) : (
                            data.items.map((r: AdminGeneration) => (
                                <TableRow key={r.id}>
                                    <TableCell>{dayjs(r.createdAt).format("MM-DD HH:mm")}</TableCell>
                                    <TableCell className="max-w-[8rem] truncate font-mono text-xs">{r.userId}</TableCell>
                                    <TableCell>{r.capability}</TableCell>
                                    <TableCell>{r.model}</TableCell>
                                    <TableCell>{r.sizeTier}</TableCell>
                                    <TableCell>{r.creditsCost}</TableCell>
                                    <TableCell className="max-w-[12rem] truncate">{r.prompt}</TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS[r.status]?.variant ?? "outline"}>{STATUS[r.status]?.label ?? r.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <DataPagination page={page} pageSize={20} total={data?.total ?? 0} onChange={setPage} />
            </Card>
        </div>
    );
}
