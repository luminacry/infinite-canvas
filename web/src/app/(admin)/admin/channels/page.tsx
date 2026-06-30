"use client";

import { useState } from "react";
import { App, Button, Card, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi, type Channel } from "@/services/api/admin";

const TYPES = ["openai", "gemini", "volcengine"];

export default function AdminChannelsPage() {
    const { message } = App.useApp();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Channel | null>(null);
    const [form] = Form.useForm();
    const { data, isLoading } = useQuery({ queryKey: ["admin-channels"], queryFn: adminApi.channels });

    const onEdit = (row?: Channel) => {
        setEditing(row ?? null);
        form.resetFields();
        form.setFieldsValue(row ?? { type: "openai", weight: 1, enabled: true });
        setOpen(true);
    };
    const onSubmit = async () => {
        const values = await form.validateFields();
        try {
            await adminApi.upsertChannel({ ...values, id: editing?.id });
            message.success("已保存");
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-channels"] });
        } catch (e) {
            message.error(e instanceof Error ? e.message : "保存失败");
        }
    };

    const columns = [
        { title: "渠道名", dataIndex: "name" },
        { title: "类型", dataIndex: "type" },
        { title: "Base URL", dataIndex: "baseUrl", ellipsis: true },
        { title: "权重", dataIndex: "weight" },
        { title: "状态", dataIndex: "enabled", render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "启用" : "停用"}</Tag> },
        { title: "操作", render: (_: unknown, r: Channel) => <Button size="small" onClick={() => onEdit(r)}>编辑</Button> },
    ];

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold">渠道管理</h1>
                <Button type="primary" onClick={() => onEdit()}>新增渠道</Button>
            </div>
            <Card>
                <Table<Channel> rowKey="id" size="small" loading={isLoading} columns={columns} dataSource={data ?? []} pagination={false} />
            </Card>
            <Modal title={editing ? "编辑渠道" : "新增渠道"} open={open} onCancel={() => setOpen(false)} onOk={onSubmit} okText="保存">
                <Form form={form} layout="vertical" className="pt-2">
                    <Form.Item name="name" label="渠道名" rules={[{ required: true }]}><Input placeholder="如 default" /></Form.Item>
                    <Form.Item name="type" label="类型" rules={[{ required: true }]}><Select options={TYPES.map((v) => ({ value: v, label: v }))} /></Form.Item>
                    <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}><Input placeholder="https://api.openai.com" /></Form.Item>
                    <Form.Item name="apiKey" label="API Key" extra={editing ? "留空表示不修改已保存的 Key" : "服务端加密存储，列表不回显"} rules={editing ? [] : [{ required: true, message: "新建必须填写 Key" }]}>
                        <Input.Password placeholder={editing ? "••••••（不改请留空）" : "sk-..."} />
                    </Form.Item>
                    <Form.Item name="weight" label="权重"><InputNumber min={1} className="w-full" /></Form.Item>
                    <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
