"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coins, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/use-auth-store";

/** 顶栏账号区：展示算力点余额 + 用户名下拉（个人中心 / 退出）。 */
export function AccountMenu() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    if (!user) return null;

    const isAdmin = user.role === "admin" || user.role === "superadmin";

    const onLogout = async () => {
        await logout();
        toast.success("已退出登录");
        router.replace("/login");
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" className="max-w-[8rem] truncate text-sm text-stone-700 transition outline-none hover:text-stone-950 dark:text-stone-200 dark:hover:text-white">
                        {user.username}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                    <DropdownMenuItem onSelect={() => router.push("/account")}>
                        <UserIcon />
                        个人中心
                    </DropdownMenuItem>
                    {isAdmin ? (
                        <DropdownMenuItem onSelect={() => router.push("/admin")}>
                            <LayoutDashboard />
                            管理后台
                        </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={onLogout}>
                        <LogOut />
                        退出登录
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
