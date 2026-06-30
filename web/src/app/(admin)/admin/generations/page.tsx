"use client";

import { useState } from "react";
import { Card, Input, Select, Space, Table, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { adminApi, type AdminGeneration } from "@/services/api/admin";

const STATUS_COLOR: Record<string, string> = { pending: "processing", success: "success", failed: "error" };

export default function AdminGenerationsPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>();
    const [userId, setUserId] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["admin-gen", page, status, userId], queryFn: () => adminApi.generations(page, 20, { status, userId: userId || undefined }) });

    const columns = [
        { title: "时间", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("MM-DD HH:mm") },
        { title: "用户", dataIndex: "userId", ellipsis: true },
        { title: "能力", dataIndex: "capability" },
        { title: "模型", dataIndex: "model" },
        { title: "档位", dataIndex: "sizeTier" },
        { title: "消耗", dataIndex: "creditsCost" },
        { title: "提示词", dataIndex: "prompt", ellipsis: true },
        { title: "状态", dataIndex: "status", render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    ];

    return (
        <div>
            <h1 className="mb-6 text-xl font-semibold">生成记录</h1>
            <Card>
                <Space className="mb-4">
                    <Select allowClear placeholder="状态" value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[{ value: "success", label: "成功" }, { value: "failed", label: "失败" }, { value: "pending", label: "进行中" }]} className="w-32" />
                    <Input.Search placeholder="按用户 ID" value={userId} onChange={(e) => setUserId(e.target.value)} onSearch={() => setPage(1)} className="w-64" />
                </Space>
                <Table<AdminGeneration>
                    rowKey="id"
                    size="small"
                    loading={isLoading}
                    columns={columns}
                    dataSource={data?.items ?? []}
                    pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
                />
            </Card>
        </div>
    );
}
