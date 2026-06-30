"use client";

import { Card, Col, Row, Statistic } from "antd";
import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/services/api/admin";

export default function AdminDashboard() {
    const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.stats });
    const cells = [
        { title: "用户总数", value: data?.totalUsers },
        { title: "今日新增", value: data?.newUsers },
        { title: "24h 生成数", value: data?.genTotal },
        { title: "24h 失败率", value: data?.genFailRate, suffix: "%" },
        { title: "24h 消耗算力点", value: data?.creditsConsumed },
        { title: "24h 兑换算力点", value: data?.redeemAmount },
    ];
    return (
        <div>
            <h1 className="mb-6 text-xl font-semibold">数据看板</h1>
            <Row gutter={[16, 16]}>
                {cells.map((c) => (
                    <Col key={c.title} xs={12} md={8}>
                        <Card>
                            <Statistic title={c.title} value={c.value ?? 0} suffix={c.suffix} />
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
