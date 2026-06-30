"use client";

import { useState } from "react";
import { App, Button, Card, InputNumber, Modal, Space, Table, Tag } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { adminApi, type AdminCode } from "@/services/api/admin";

const STATUS: Record<string, { label: string; color: string }> = {
    unused: { label: "未使用", color: "blue" },
    used: { label: "已使用", color: "green" },
    disabled: { label: "已禁用", color: "default" },
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
    const { message } = App.useApp();
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
            message.error(e instanceof Error ? e.message : "生成失败");
        }
    };
    const onDisable = async (batchId: string | null) => {
        if (!batchId) return;
        const count = await adminApi.disableCodes(batchId);
        message.success(`已禁用 ${count.count} 个未使用码`);
        qc.invalidateQueries({ queryKey: ["admin-codes"] });
    };

    const columns = [
        { title: "批次", dataIndex: "batchId" },
        { title: "面值", dataIndex: "credits" },
        { title: "状态", dataIndex: "status", render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label ?? v}</Tag> },
        { title: "兑换人", dataIndex: "usedBy", render: (v: string | null) => v || "-" },
        { title: "创建时间", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm") },
        { title: "操作", render: (_: unknown, r: AdminCode) => <Button size="small" danger onClick={() => onDisable(r.batchId)}>禁用本批</Button> },
    ];

    return (
        <div>
            <h1 className="mb-6 text-xl font-semibold">兑换码</h1>
            <Card className="mb-4">
                <Space>
                    面值
                    <InputNumber min={1} value={form.credits} onChange={(v) => setForm({ ...form, credits: Number(v) || 0 })} />
                    数量
                    <InputNumber min={1} max={5000} value={form.count} onChange={(v) => setForm({ ...form, count: Number(v) || 0 })} />
                    <Button type="primary" onClick={onGenerate}>批量生成</Button>
                </Space>
            </Card>
            <Card>
                <Table<AdminCode> rowKey="id" size="small" loading={isLoading} columns={columns} dataSource={data?.items ?? []} pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }} />
            </Card>
            <Modal title="兑换码已生成（仅此一次可见）" open={!!generated} onCancel={() => setGenerated(null)} footer={<Button type="primary" onClick={() => generated && downloadCsv(generated.batchId, generated.codes)}>下载 CSV</Button>}>
                <p className="mb-2 text-sm text-stone-500">批次 {generated?.batchId}，请立即导出保存，关闭后无法再次查看明文。</p>
                <div className="max-h-60 overflow-auto rounded bg-stone-50 p-3 font-mono text-xs dark:bg-stone-900">
                    {generated?.codes.map((c) => <div key={c}>{c}</div>)}
                </div>
            </Modal>
        </div>
    );
}
