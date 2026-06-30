"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Result, Spin } from "antd";
import { BarChart3, Coins, Image as ImageIcon, KeyRound, Tags, Users } from "lucide-react";

import { useAuthStore } from "@/stores/use-auth-store";

const NAV = [
    { key: "/admin", icon: <BarChart3 className="size-4" />, label: "数据看板" },
    { key: "/admin/users", icon: <Users className="size-4" />, label: "用户管理" },
    { key: "/admin/generations", icon: <ImageIcon className="size-4" />, label: "生成记录" },
    { key: "/admin/codes", icon: <Coins className="size-4" />, label: "兑换码" },
    { key: "/admin/pricing", icon: <Tags className="size-4" />, label: "模型定价" },
    { key: "/admin/channels", icon: <KeyRound className="size-4" />, label: "渠道管理" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const ready = useAuthStore((s) => s.ready);
    const fetchMe = useAuthStore((s) => s.fetchMe);

    useEffect(() => {
        if (!ready) fetchMe();
    }, [ready, fetchMe]);

    useEffect(() => {
        if (ready && !user) router.replace("/login?redirect=/admin");
    }, [ready, user, router]);

    if (!ready || !user) return <div className="flex h-dvh items-center justify-center"><Spin size="large" /></div>;
    if (user.role !== "admin" && user.role !== "superadmin") {
        return <Result status="403" title="403" subTitle="你没有访问管理后台的权限" />;
    }

    const selected = NAV.reduce((acc, n) => (pathname === n.key || (n.key !== "/admin" && pathname.startsWith(n.key)) ? n.key : acc), "/admin");

    return (
        <Layout className="min-h-dvh">
            <Layout.Sider theme="light" breakpoint="lg" collapsedWidth="0">
                <div className="px-4 py-4 text-base font-semibold">无限画布 · 后台</div>
                <Menu mode="inline" selectedKeys={[selected]} items={NAV.map((n) => ({ key: n.key, icon: n.icon, label: <Link href={n.key}>{n.label}</Link> }))} />
            </Layout.Sider>
            <Layout.Content className="overflow-auto p-6">{children}</Layout.Content>
        </Layout>
    );
}
