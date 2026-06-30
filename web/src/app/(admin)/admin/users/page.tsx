"use client";

import { useState } from "react";
import { App, Button, Card, Input, InputNumber, Modal, Space, Table, Tag } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { adminApi, type AdminUser } from "@/services/api/admin";

export default function AdminUsersPage() {
    const { message } = App.useApp();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["admin-users", page, search], queryFn: () => adminApi.users(page, 20, search) });

    const [adjust, setAdjust] = useState<{ user: AdminUser; delta: number; remark: string } | null>(null);

    const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

    const onBan = async (u: AdminUser) => {
        await adminApi.banUser(u.id, u.status !== "banned");
        message.success(u.status === "banned" ? "已解封" : "已封禁");
        refresh();
    };
    const submitAdjust = async () => {
        if (!adjust) return;
        try {
            await adminApi.adjustCredits(adjust.user.id, adjust.delta, adjust.remark);
            message.success("已调整");
            setAdjust(null);
            refresh();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "调整失败");
        }
    };

    const columns = [
        { title: "邮箱", dataIndex: "email" },
        { title: "用户名", dataIndex: "username" },
        { title: "角色", dataIndex: "role" },
        { title: "状态", dataIndex: "status", render: (v: string) => <Tag color={v === "banned" ? "red" : "green"}>{v === "banned" ? "已封禁" : "正常"}</Tag> },
        { title: "余额", dataIndex: "creditBalance" },
        { title: "注册时间", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("YYYY-MM-DD") },
        {
            title: "操作",
            render: (_: unknown, u: AdminUser) => (
                <Space>
                    <Button size="small" onClick={() => setAdjust({ user: u, delta: 0, remark: "" })}>
                        调点
                    </Button>
                    <Button size="small" danger={u.status !== "banned"} onClick={() => onBan(u)}>
                        {u.status === "banned" ? "解封" : "封禁"}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <h1 className="mb-6 text-xl font-semibold">用户管理</h1>
            <Card>
                <div className="mb-4 flex gap-2">
                    <Input.Search placeholder="搜索邮箱/用户名" value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={() => { setPage(1); setSearch(keyword); }} className="max-w-xs" />
                </div>
                <Table<AdminUser>
                    rowKey="id"
                    size="small"
                    loading={isLoading}
                    columns={columns}
                    dataSource={data?.items ?? []}
                    pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
                />
            </Card>
            <Modal title={`调整算力点 - ${adjust?.user.username ?? ""}`} open={!!adjust} onCancel={() => setAdjust(null)} onOk={submitAdjust} okText="确认">
                <div className="space-y-3 pt-2">
                    <InputNumber className="w-full" placeholder="正数增加 / 负数扣减" value={adjust?.delta} onChange={(v) => adjust && setAdjust({ ...adjust, delta: Number(v) || 0 })} />
                    <Input placeholder="备注（会记入账本与审计）" value={adjust?.remark} onChange={(e) => adjust && setAdjust({ ...adjust, remark: e.target.value })} />
                </div>
            </Modal>
        </div>
    );
}
