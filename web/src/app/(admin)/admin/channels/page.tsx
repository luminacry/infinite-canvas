"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, type Channel } from "@/services/api/admin";

const TYPES = ["openai", "gemini", "volcengine"];
type Draft = { id?: string; name: string; type: string; baseUrl: string; apiKey: string; weight: number; enabled: boolean };
const EMPTY: Draft = { name: "", type: "openai", baseUrl: "", apiKey: "", weight: 1, enabled: true };

export default function AdminChannelsPage() {
    const qc = useQueryClient();
    const [draft, setDraft] = useState<Draft | null>(null);
    const isEditing = Boolean(draft?.id);
    const { data, isLoading } = useQuery({ queryKey: ["admin-channels"], queryFn: adminApi.channels });

    const onSubmit = async () => {
        if (!draft) return;
        if (!draft.name || !draft.baseUrl) return toast.warning("请填写渠道名和 Base URL");
        if (!draft.id && !draft.apiKey) return toast.warning("新建渠道必须填写 API Key");
        try {
            await adminApi.upsertChannel({ ...draft, apiKey: draft.apiKey || undefined });
            toast.success("已保存");
            setDraft(null);
            qc.invalidateQueries({ queryKey: ["admin-channels"] });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "保存失败");
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold">渠道管理</h1>
                <Button onClick={() => setDraft({ ...EMPTY })}>新增渠道</Button>
            </div>
            <Card className="p-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>渠道名</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>Base URL</TableHead>
                            <TableHead>权重</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">加载中…</TableCell></TableRow>
                        ) : !data?.length ? (
                            <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">暂无渠道</TableCell></TableRow>
                        ) : (
                            data.map((r: Channel) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.name}</TableCell>
                                    <TableCell>{r.type}</TableCell>
                                    <TableCell className="max-w-[16rem] truncate">{r.baseUrl}</TableCell>
                                    <TableCell>{r.weight}</TableCell>
                                    <TableCell><Badge variant={r.enabled ? "default" : "outline"}>{r.enabled ? "启用" : "停用"}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => setDraft({ ...r, apiKey: "" })}>编辑</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "编辑渠道" : "新增渠道"}</DialogTitle>
                    </DialogHeader>
                    {draft ? (
                        <div className="flex flex-col gap-4 py-2">
                            <div className="flex flex-col gap-1.5">
                                <Label>渠道名</Label>
                                <Input placeholder="如 渠道1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>类型</Label>
                                <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Base URL</Label>
                                <Input placeholder="https://api.openai.com" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>API Key</Label>
                                <Input type="password" placeholder={isEditing ? "••••••（不改请留空）" : "sk-..."} value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
                                <span className="text-muted-foreground text-xs">{isEditing ? "留空表示不修改已保存的 Key" : "服务端加密存储，列表不回显"}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>权重</Label>
                                <Input type="number" min={1} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) || 1 })} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                                <Label>启用</Label>
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDraft(null)}>取消</Button>
                        <Button onClick={onSubmit}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
