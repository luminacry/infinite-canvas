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
import { adminApi, type Pricing } from "@/services/api/admin";

const TIERS = ["t1k", "t2k", "t4k", "standard"];
const CAPS = ["image", "video", "audio", "text"];
type Draft = { id?: string; channel: string; model: string; capability: string; sizeTier: string; creditsCost: number; enabled: boolean };
const EMPTY: Draft = { channel: "", model: "", capability: "image", sizeTier: "t1k", creditsCost: 5, enabled: true };

export default function AdminPricingPage() {
    const qc = useQueryClient();
    const [draft, setDraft] = useState<Draft | null>(null);
    const { data, isLoading } = useQuery({ queryKey: ["admin-pricing"], queryFn: adminApi.pricing });

    const onSubmit = async () => {
        if (!draft) return;
        if (!draft.channel || !draft.model) return toast.warning("请填写渠道名和模型名");
        try {
            await adminApi.upsertPricing(draft);
            toast.success("已保存");
            setDraft(null);
            qc.invalidateQueries({ queryKey: ["admin-pricing"] });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "保存失败");
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold">模型定价</h1>
                <Button onClick={() => setDraft({ ...EMPTY })}>新增定价</Button>
            </div>
            <Card className="p-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>渠道</TableHead>
                            <TableHead>模型</TableHead>
                            <TableHead>能力</TableHead>
                            <TableHead>档位</TableHead>
                            <TableHead>单价(算力点)</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center">加载中…</TableCell></TableRow>
                        ) : !data?.length ? (
                            <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center">暂无定价</TableCell></TableRow>
                        ) : (
                            data.map((r: Pricing) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.channel}</TableCell>
                                    <TableCell>{r.model}</TableCell>
                                    <TableCell>{r.capability}</TableCell>
                                    <TableCell>{r.sizeTier}</TableCell>
                                    <TableCell className="tabular-nums">{r.creditsCost}</TableCell>
                                    <TableCell><Badge variant={r.enabled ? "default" : "outline"}>{r.enabled ? "启用" : "停用"}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => setDraft({ ...r })}>编辑</Button>
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
                        <DialogTitle>模型定价</DialogTitle>
                    </DialogHeader>
                    {draft ? (
                        <div className="flex flex-col gap-4 py-2">
                            <div className="flex flex-col gap-1.5">
                                <Label>渠道名</Label>
                                <Input placeholder="与渠道管理中的渠道名一致" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>模型名</Label>
                                <Input placeholder="如 gpt-image-2" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label>能力</Label>
                                    <Select value={draft.capability} onValueChange={(v) => setDraft({ ...draft, capability: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{CAPS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>分辨率档</Label>
                                    <Select value={draft.sizeTier} onValueChange={(v) => setDraft({ ...draft, sizeTier: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{TIERS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>单价（算力点）</Label>
                                <Input type="number" min={0} value={draft.creditsCost} onChange={(e) => setDraft({ ...draft, creditsCost: Number(e.target.value) || 0 })} />
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
