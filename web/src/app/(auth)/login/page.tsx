"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App } from "antd";

import { Signup1 } from "@/components/ui/signup-1";
import { useAuthStore } from "@/stores/use-auth-store";

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const { message } = App.useApp();
    const login = useAuthStore((s) => s.login);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const redirect = params.get("redirect");
    const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return message.warning("请输入邮箱");
        if (!password) return message.warning("请输入密码");
        setLoading(true);
        try {
            await login(email.trim(), password);
            message.success("登录成功");
            router.replace(decodeURIComponent(redirect || "/"));
        } catch (err) {
            message.error(err instanceof Error ? err.message : "登录失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Signup1
            heading="登录无限画布"
            logo={{ url: "/", src: "/logo.svg", alt: "无限画布", title: "无限画布" }}
            signupText={loading ? "登录中…" : "登录"}
            googleText="使用 Google 登录"
            loginText="还没有账号？"
            loginUrl={registerHref}
            loginLinkText="注册"
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={onSubmit}
            onGoogle={() => message.info("第三方登录即将支持")}
            loading={loading}
        />
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
