"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Coins, Image as ImageIcon, KeyRound, Loader2, Tags, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/use-auth-store";

const NAV = [
    { key: "/admin", icon: BarChart3, label: "数据看板" },
    { key: "/admin/users", icon: Users, label: "用户管理" },
    { key: "/admin/generations", icon: ImageIcon, label: "生成记录" },
    { key: "/admin/codes", icon: Coins, label: "兑换码" },
    { key: "/admin/pricing", icon: Tags, label: "模型定价" },
    { key: "/admin/channels", icon: KeyRound, label: "渠道管理" },
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

    if (!ready || !user) {
        return (
            <div className="bg-background flex h-dvh items-center justify-center">
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
        );
    }
    if (user.role !== "admin" && user.role !== "superadmin") {
        return (
            <div className="bg-background text-foreground flex h-dvh flex-col items-center justify-center gap-2">
                <div className="text-4xl font-semibold">403</div>
                <p className="text-muted-foreground text-sm">你没有访问管理后台的权限</p>
                <Link href="/" className="text-primary mt-2 text-sm hover:underline">
                    返回首页
                </Link>
            </div>
        );
    }

    const selected = NAV.reduce((acc, n) => (pathname === n.key || (n.key !== "/admin" && pathname.startsWith(n.key)) ? n.key : acc), "/admin");

    return (
        <div className="bg-background text-foreground flex min-h-dvh">
            <aside className="bg-card hidden w-60 shrink-0 flex-col border-r lg:flex">
                <div className="flex h-14 items-center gap-2 border-b px-5 text-sm font-semibold">无限画布 · 后台</div>
                <nav className="flex flex-1 flex-col gap-1 p-3">
                    {NAV.map((n) => {
                        const Icon = n.icon;
                        const active = selected === n.key;
                        return (
                            <Link
                                key={n.key}
                                href={n.key}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                )}
                            >
                                <Icon className="size-4" />
                                {n.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
            <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
        </div>
    );
}
