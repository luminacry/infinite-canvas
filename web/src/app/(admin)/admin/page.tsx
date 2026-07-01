"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="animate-in fade-in duration-300">
            <h1 className="mb-6 text-xl font-semibold">数据看板</h1>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {cells.map((c) => (
                    <Card key={c.title}>
                        <CardHeader className="pb-2">
                            <CardDescription>{c.title}</CardDescription>
                            <CardTitle className="text-3xl tabular-nums">
                                {c.value ?? 0}
                                {c.suffix ? <span className="text-muted-foreground ml-1 text-base font-normal">{c.suffix}</span> : null}
                            </CardTitle>
                        </CardHeader>
                        <CardContent />
                    </Card>
                ))}
            </div>
        </div>
    );
}
