"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "sonner";
import { WalletIcon, ImageIcon, GaugeIcon, ZapIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { creditsApi, LEDGER_REASON_LABEL, type LedgerItem } from "@/services/api/credits";
import { meApi, type GenerationItem } from "@/services/api/me";
import { useAuthStore } from "@/stores/use-auth-store";
import StatisticsWithStatus, { type StatisticsCardProps } from "@/components/shadcn-studio/blocks/statistics-with-status";

const GEN_STATUS: Record<GenerationItem["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "进行中", variant: "secondary" },
    success: { label: "成功", variant: "default" },
    failed: { label: "失败", variant: "destructive" },
};

function BalanceAndLedger() {
    const balance = useAuthStore((s) => s.user?.creditBalance ?? 0);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const { data, isLoading } = useQuery({ queryKey: ["ledger", page], queryFn: () => creditsApi.ledger(page, pageSize) });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardDescription>当前算力点</CardDescription>
                    <CardTitle className="text-3xl tabular-nums">
                        {balance}
                        <span className="text-muted-foreground ml-1 text-base font-normal">点</span>
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card className="p-4">
                <div className="mb-3 text-sm font-medium">账本流水</div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>变动</TableHead>
                            <TableHead>余额</TableHead>
                            <TableHead>备注</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-muted-foreground py-8 text-center">加载中…</TableCell></TableRow>
                        ) : !data?.items.length ? (
                            <TableRow><TableCell colSpan={5} className="text-muted-foreground py-8 text-center">暂无流水</TableCell></TableRow>
                        ) : (
                            data.items.map((r: LedgerItem) => (
                                <TableRow key={r.id}>
                                    <TableCell>{dayjs(r.createdAt).format("YYYY-MM-DD HH:mm")}</TableCell>
                                    <TableCell><Badge variant="secondary">{LEDGER_REASON_LABEL[r.reason]}</Badge></TableCell>
                                    <TableCell className={r.delta >= 0 ? "text-green-600" : "text-red-500"}>{r.delta >= 0 ? `+${r.delta}` : r.delta}</TableCell>
                                    <TableCell className="tabular-nums">{r.balance}</TableCell>
                                    <TableCell className="text-muted-foreground">{r.remark || "-"}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <DataPagination page={page} pageSize={pageSize} total={data?.total ?? 0} onChange={setPage} />
            </Card>
        </div>
    );
}

function Redeem() {
    const setBalance = useAuthStore((s) => s.setBalance);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const onRedeem = async () => {
        if (!code.trim()) return toast.warning("请输入兑换码");
        setLoading(true);
        try {
            const { credits, balance } = await creditsApi.redeem(code.trim());
            setBalance(balance);
            setCode("");
            toast.success(`兑换成功，到账 ${credits} 算力点`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "兑换失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-md p-6">
            <div className="mb-1 text-sm font-medium">兑换码充值</div>
            <p className="text-muted-foreground mb-3 text-sm">输入兑换码即可为账户充值算力点。</p>
            <div className="flex gap-2">
                <Input placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onRedeem()} />
                <Button disabled={loading} onClick={onRedeem}>{loading ? "兑换中…" : "兑换"}</Button>
            </div>
        </Card>
    );
}

function History() {
    const [page, setPage] = useState(1);
    const [preview, setPreview] = useState<string | null>(null);
    const pageSize = 10;
    const { data, isLoading } = useQuery({ queryKey: ["generations", page], queryFn: () => meApi.generations(page, pageSize) });
    return (
        <Card className="p-4">
            <div className="mb-3 text-sm font-medium">生成历史</div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>能力</TableHead>
                        <TableHead>模型</TableHead>
                        <TableHead>提示词</TableHead>
                        <TableHead>档位</TableHead>
                        <TableHead>消耗</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>产物</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={8} className="text-muted-foreground py-8 text-center">加载中…</TableCell></TableRow>
                    ) : !data?.items.length ? (
                        <TableRow><TableCell colSpan={8} className="text-muted-foreground py-8 text-center">暂无记录</TableCell></TableRow>
                    ) : (
                        data.items.map((r: GenerationItem) => (
                            <TableRow key={r.id}>
                                <TableCell>{dayjs(r.createdAt).format("MM-DD HH:mm")}</TableCell>
                                <TableCell>{r.capability}</TableCell>
                                <TableCell>{r.model}</TableCell>
                                <TableCell className="max-w-[12rem] truncate">{r.prompt}</TableCell>
                                <TableCell>{r.sizeTier}</TableCell>
                                <TableCell>{r.creditsCost}</TableCell>
                                <TableCell><Badge variant={GEN_STATUS[r.status].variant}>{GEN_STATUS[r.status].label}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {r.outputs.slice(0, 4).map((o, i) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={i} src={o.url} alt="" className="size-10 cursor-pointer rounded object-cover" onClick={() => setPreview(o.url)} />
                                        ))}
                                        {!r.outputs.length ? <span className="text-muted-foreground text-xs">-</span> : null}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <DataPagination page={page} pageSize={pageSize} total={data?.total ?? 0} onChange={setPage} />
            <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
                <DialogContent className="max-w-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {preview ? <img src={preview} alt="预览" className="mx-auto max-h-[80vh] w-auto rounded" /> : null}
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function Gallery() {
    const [page, setPage] = useState(1);
    const [preview, setPreview] = useState<string | null>(null);
    const { data, isLoading } = useQuery({ queryKey: ["gallery", page], queryFn: () => meApi.gallery(page, 24) });
    if (!isLoading && !data?.items.length) return <div className="text-muted-foreground py-16 text-center text-sm">还没有生成图片</div>;
    return (
        <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {(data?.items ?? []).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={img.url} alt={img.prompt} title={img.prompt} className="aspect-square cursor-pointer rounded-lg object-cover transition-transform hover:scale-[1.02]" onClick={() => setPreview(img.url)} />
                ))}
            </div>
            <DataPagination page={page} pageSize={24} total={data?.total ?? 0} onChange={setPage} />
            <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
                <DialogContent className="max-w-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {preview ? <img src={preview} alt="预览" className="mx-auto max-h-[80vh] w-auto rounded" /> : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Overview() {
    const liveBalance = useAuthStore((s) => s.user?.creditBalance);
    const { data } = useQuery({ queryKey: ["account-overview"], queryFn: () => meApi.overview() });
    const balance = liveBalance ?? data?.balance ?? 0;

    const cards: StatisticsCardProps[] = [
        { title: "算力点余额", value: `${balance.toLocaleString()} 点`, status: balance > 0 ? "within" : "exceed", range: balance > 0 ? "可正常生成" : "余额不足，请充值", icon: <WalletIcon /> },
        { title: "累计生成", value: (data?.totalGenerations ?? 0).toLocaleString(), status: "observe", range: `成功 ${data?.successCount ?? 0} · 失败 ${data?.failedCount ?? 0}`, icon: <ImageIcon /> },
        {
            title: "成功率",
            value: `${data?.successRate ?? 0}%`,
            status: data?.totalGenerations === 0 || data === undefined ? "unknown" : (data?.successRate ?? 0) >= 90 ? "within" : (data?.successRate ?? 0) >= 70 ? "observe" : "exceed",
            range: data?.totalGenerations ? `共 ${data.totalGenerations} 次` : "暂无生成记录",
            icon: <GaugeIcon />,
        },
        { title: "本月消耗", value: `${(data?.monthSpent ?? 0).toLocaleString()} 点`, status: "observe", range: "本自然月生成消费", icon: <ZapIcon /> },
    ];

    return (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => (
                <StatisticsWithStatus key={index} {...card} />
            ))}
        </div>
    );
}

function AccountTabs() {
    const params = useSearchParams();
    const [active, setActive] = useState("balance");
    useEffect(() => {
        const tab = params.get("tab");
        if (tab) setActive(tab);
    }, [params]);

    return (
        <Tabs value={active} onValueChange={setActive}>
            <TabsList>
                <TabsTrigger value="balance">余额 & 账本</TabsTrigger>
                <TabsTrigger value="history">生成历史</TabsTrigger>
                <TabsTrigger value="gallery">我的图库</TabsTrigger>
                <TabsTrigger value="redeem">兑换充值</TabsTrigger>
            </TabsList>
            <TabsContent value="balance" className="mt-4 animate-in fade-in duration-200"><BalanceAndLedger /></TabsContent>
            <TabsContent value="history" className="mt-4 animate-in fade-in duration-200"><History /></TabsContent>
            <TabsContent value="gallery" className="mt-4 animate-in fade-in duration-200"><Gallery /></TabsContent>
            <TabsContent value="redeem" className="mt-4 animate-in fade-in duration-200"><Redeem /></TabsContent>
        </Tabs>
    );
}

export default function AccountPage() {
    return (
        <div className="mx-auto h-full max-w-5xl overflow-auto px-6 py-8">
            <h1 className="mb-6 text-xl font-semibold">个人中心</h1>
            <Overview />
            <Suspense>
                <AccountTabs />
            </Suspense>
        </div>
    );
}
