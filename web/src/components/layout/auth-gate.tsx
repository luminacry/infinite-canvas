"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";

import { useAuthStore } from "@/stores/use-auth-store";

/** 应用入口鉴权：首次挂载探测登录态，未登录跳 /login（带 redirect 回跳）。 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const ready = useAuthStore((s) => s.ready);
    const fetchMe = useAuthStore((s) => s.fetchMe);

    useEffect(() => {
        if (!ready) fetchMe();
    }, [ready, fetchMe]);

    useEffect(() => {
        if (ready && !user) {
            const redirect = encodeURIComponent(pathname || "/");
            router.replace(`/login?redirect=${redirect}`);
        }
    }, [ready, user, pathname, router]);

    if (!ready || !user) {
        return (
            <div className="flex h-dvh items-center justify-center bg-background">
                <Spin size="large" />
            </div>
        );
    }
    return <>{children}</>;
}
