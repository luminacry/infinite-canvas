"use client";

import { useState } from "react";
import { App, Button, Card, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi, type Pricing } from "@/services/api/admin";

const TIERS = ["t1k", "t2k", "t4k", "standard"];
const CAPS = ["image", "video", "audio", "text"];

export default function AdminPricingPage() {
    const { message } = App.useApp();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const { data, isLoading } = useQuery({ queryKey: ["admin-pricing"], queryFn: adminApi.pricing });

    const onEdit = (row?: Pricing) => {
        form.setFieldsValue(row ?? { capability: "image", sizeTier: "t1k", enabled: true, creditsCost: 5 });
        setOpen(true);
    };
    const onSubmit = async () => {
        const values = await form.validateFields();
        try {
            await adminApi.upsertPricing(values);
            message.success("已保存");
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-pricing"] });
        } catch (e) {
            message.error(e instanceof Error ? e.message : "保存失败");
        }
    };

    const columns = [
        { title: "渠道", dataIndex: "channel" },
        { title: "模型", dataIndex: "model" },
        { title: "能力", dataIndex: "capability" },
        { title: "档位", dataIndex: "sizeTier" },
        { title: "单价(算力点)", dataIndex: "creditsCost" },
        { title: "状态", dataIndex: "enabled", render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "启用" : "停用"}</Tag> },
        { title: "操作", render: (_: unknown, r: Pricing) => <Button size="small" onClick={() => onEdit(r)}>编辑</Button> },
    ];

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold">模型定价</h1>
                <Button type="primary" onClick={() => onEdit()}>新增定价</Button>
            </div>
            <Card>
                <Table<Pricing> rowKey="id" size="small" loading={isLoading} columns={columns} dataSource={data ?? []} pagination={false} />
            </Card>
            <Modal title="模型定价" open={open} onCancel={() => setOpen(false)} onOk={onSubmit} okText="保存">
                <Form form={form} layout="vertical" className="pt-2">
                    <Form.Item name="channel" label="渠道名" rules={[{ required: true }]}><Input placeholder="与渠道管理中的渠道名一致" /></Form.Item>
                    <Form.Item name="model" label="模型名" rules={[{ required: true }]}><Input placeholder="如 gpt-image-2" /></Form.Item>
                    <Form.Item name="capability" label="能力" rules={[{ required: true }]}><Select options={CAPS.map((v) => ({ value: v, label: v }))} /></Form.Item>
                    <Form.Item name="sizeTier" label="分辨率档" rules={[{ required: true }]}><Select options={TIERS.map((v) => ({ value: v, label: v }))} /></Form.Item>
                    <Form.Item name="creditsCost" label="单价（算力点）" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item>
                    <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
