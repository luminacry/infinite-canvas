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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, type AdminUser } from "@/services/api/admin";

export default function AdminUsersPage() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["admin-users", page, search], queryFn: () => adminApi.users(page, 20, search) });

    const [adjust, setAdjust] = useState<{ user: AdminUser; delta: number; remark: string } | null>(null);
    const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

    const onBan = async (u: AdminUser) => {
        try {
            await adminApi.banUser(u.id, u.status !== "banned");
            toast.success(u.status === "banned" ? "已解封" : "已封禁");
            refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };
    const submitAdjust = async () => {
        if (!adjust) return;
        try {
            await adminApi.adjustCredits(adjust.user.id, adjust.delta, adjust.remark);
            toast.success("已调整");
            setAdjust(null);
            refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "调整失败");
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="mb-6 text-xl font-semibold">用户管理</h1>
            <Card className="p-4">
                <div className="mb-4 flex gap-2">
                    <Input placeholder="搜索邮箱/用户名，回车搜索" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setPage(1), setSearch(keyword))} className="max-w-xs" />
                    <Button variant="secondary" onClick={() => { setPage(1); setSearch(keyword); }}>搜索</Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>邮箱</TableHead>
                            <TableHead>用户名</TableHead>
                            <TableHead>角色</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>余额</TableHead>
                            <TableHead>注册时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center">加载中…</TableCell></TableRow>
                        ) : !data?.items.length ? (
                            <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center">暂无用户</TableCell></TableRow>
                        ) : (
                            data.items.map((u: AdminUser) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.username}</TableCell>
                                    <TableCell>{u.role}</TableCell>
                                    <TableCell>
                                        <Badge variant={u.status === "banned" ? "destructive" : "default"}>{u.status === "banned" ? "已封禁" : "正常"}</Badge>
                                    </TableCell>
                                    <TableCell className="tabular-nums">{u.creditBalance}</TableCell>
                                    <TableCell>{dayjs(u.createdAt).format("YYYY-MM-DD")}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setAdjust({ user: u, delta: 0, remark: "" })}>调点</Button>
                                            <Button variant={u.status === "banned" ? "outline" : "destructive"} size="sm" onClick={() => onBan(u)}>
                                                {u.status === "banned" ? "解封" : "封禁"}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <DataPagination page={page} pageSize={20} total={data?.total ?? 0} onChange={setPage} />
            </Card>

            <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>调整算力点 - {adjust?.user.username ?? ""}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-2">
                        <Input type="number" placeholder="正数增加 / 负数扣减" value={adjust?.delta ?? ""} onChange={(e) => adjust && setAdjust({ ...adjust, delta: Number(e.target.value) || 0 })} />
                        <Input placeholder="备注（会记入账本与审计）" value={adjust?.remark ?? ""} onChange={(e) => adjust && setAdjust({ ...adjust, remark: e.target.value })} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdjust(null)}>取消</Button>
                        <Button onClick={submitAdjust}>确认</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
