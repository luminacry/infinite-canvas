"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { App, Button, Card, Empty, Image, Input, Statistic, Table, Tabs, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { creditsApi, LEDGER_REASON_LABEL, type LedgerItem } from "@/services/api/credits";
import { meApi, type GenerationItem } from "@/services/api/me";
import { useAuthStore } from "@/stores/use-auth-store";

const GEN_STATUS: Record<GenerationItem["status"], { label: string; color: string }> = {
    pending: { label: "进行中", color: "processing" },
    success: { label: "成功", color: "success" },
    failed: { label: "失败", color: "error" },
};

function BalanceAndLedger() {
    const balance = useAuthStore((s) => s.user?.creditBalance ?? 0);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const { data, isLoading } = useQuery({
        queryKey: ["ledger", page],
        queryFn: () => creditsApi.ledger(page, pageSize),
    });

    const columns = [
        { title: "时间", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm") },
        { title: "类型", dataIndex: "reason", render: (v: LedgerItem["reason"]) => <Tag>{LEDGER_REASON_LABEL[v]}</Tag> },
        { title: "变动", dataIndex: "delta", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-500"}>{v >= 0 ? `+${v}` : v}</span> },
        { title: "余额", dataIndex: "balance" },
        { title: "备注", dataIndex: "remark", render: (v: string | null) => v || "-" },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <Statistic title="当前算力点" value={balance} suffix="点" />
            </Card>
            <Card title="账本流水">
                <Table<LedgerItem>
                    rowKey="id"
                    size="small"
                    loading={isLoading}
                    columns={columns}
                    dataSource={data?.items ?? []}
                    pagination={{ current: page, pageSize, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
                />
            </Card>
        </div>
    );
}

function Redeem() {
    const { message } = App.useApp();
    const setBalance = useAuthStore((s) => s.setBalance);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const onRedeem = async () => {
        if (!code.trim()) return message.warning("请输入兑换码");
        setLoading(true);
        try {
            const { credits, balance } = await creditsApi.redeem(code.trim());
            setBalance(balance);
            setCode("");
            message.success(`兑换成功，到账 ${credits} 算力点`);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "兑换失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="兑换码充值" className="max-w-md">
            <p className="mb-3 text-sm text-stone-500">输入兑换码即可为账户充值算力点。</p>
            <div className="flex gap-2">
                <Input size="large" placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} onPressEnter={onRedeem} />
                <Button type="primary" size="large" loading={loading} onClick={onRedeem}>
                    兑换
                </Button>
            </div>
        </Card>
    );
}

function History() {
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const { data, isLoading } = useQuery({ queryKey: ["generations", page], queryFn: () => meApi.generations(page, pageSize) });
    const columns = [
        { title: "时间", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("MM-DD HH:mm") },
        { title: "能力", dataIndex: "capability" },
        { title: "模型", dataIndex: "model" },
        { title: "提示词", dataIndex: "prompt", ellipsis: true },
        { title: "档位", dataIndex: "sizeTier" },
        { title: "消耗", dataIndex: "creditsCost" },
        { title: "状态", dataIndex: "status", render: (v: GenerationItem["status"]) => <Tag color={GEN_STATUS[v].color}>{GEN_STATUS[v].label}</Tag> },
    ];
    return (
        <Card title="生成历史">
            <Table<GenerationItem>
                rowKey="id"
                size="small"
                loading={isLoading}
                columns={columns}
                dataSource={data?.items ?? []}
                expandable={{
                    expandedRowRender: (r) =>
                        r.outputs.length ? (
                            <div className="flex flex-wrap gap-2">
                                {r.outputs.map((o, i) => (
                                    <Image key={i} src={o.url} width={96} height={96} className="rounded object-cover" />
                                ))}
                            </div>
                        ) : (
                            <span className="text-stone-400">无产物</span>
                        ),
                }}
                pagination={{ current: page, pageSize, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
            />
        </Card>
    );
}

function Gallery() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useQuery({ queryKey: ["gallery", page], queryFn: () => meApi.gallery(page, 24) });
    if (!isLoading && !data?.items.length) return <Empty description="还没有生成图片" />;
    return (
        <Image.PreviewGroup>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {(data?.items ?? []).map((img) => (
                    <Image key={img.id} src={img.url} alt={img.prompt} className="aspect-square rounded-lg object-cover" />
                ))}
            </div>
        </Image.PreviewGroup>
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
        <Tabs
            activeKey={active}
            onChange={setActive}
            items={[
                { key: "balance", label: "余额 & 账本", children: <BalanceAndLedger /> },
                { key: "history", label: "生成历史", children: <History /> },
                { key: "gallery", label: "我的图库", children: <Gallery /> },
                { key: "redeem", label: "兑换充值", children: <Redeem /> },
            ]}
        />
    );
}

export default function AccountPage() {
    return (
        <div className="mx-auto h-full max-w-5xl overflow-auto px-6 py-8">
            <h1 className="mb-6 text-xl font-semibold">个人中心</h1>
            <Suspense>
                <AccountTabs />
            </Suspense>
        </div>
    );
}
