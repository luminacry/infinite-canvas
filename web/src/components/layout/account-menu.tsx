"use client";

import { useRouter } from "next/navigation";
import { App, Dropdown, type MenuProps } from "antd";
import { Coins, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import { useAuthStore } from "@/stores/use-auth-store";

/** 顶栏账号区：展示算力点余额 + 用户名下拉（个人中心 / 退出）。 */
export function AccountMenu() {
    const router = useRouter();
    const { message } = App.useApp();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    if (!user) return null;

    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const items: MenuProps["items"] = [
        { key: "account", icon: <UserIcon className="size-4" />, label: "个人中心" },
        ...(isAdmin ? [{ key: "admin", icon: <LayoutDashboard className="size-4" />, label: "管理后台" }] : []),
        { type: "divider" as const },
        { key: "logout", icon: <LogOut className="size-4" />, label: "退出登录", danger: true },
    ];

    const onClick: MenuProps["onClick"] = async ({ key }) => {
        if (key === "account") router.push("/account");
        if (key === "admin") router.push("/admin");
        if (key === "logout") {
            await logout();
            message.success("已退出登录");
            router.replace("/login");
        }
    };

    return (
        <div className="inline-flex items-center gap-2">
            <button
                type="button"
                onClick={() => router.push("/account?tab=redeem")}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:border-stone-300 dark:border-stone-700 dark:text-stone-200"
                title="算力点余额，点击充值"
            >
                <Coins className="size-3.5 text-amber-500" />
                {user.creditBalance}
            </button>
            <Dropdown menu={{ items, onClick }} placement="bottomRight" trigger={["click"]}>
                <button type="button" className="max-w-[8rem] truncate text-sm text-stone-700 transition hover:text-stone-950 dark:text-stone-200 dark:hover:text-white">
                    {user.username}
                </button>
            </Dropdown>
        </div>
    );
}
