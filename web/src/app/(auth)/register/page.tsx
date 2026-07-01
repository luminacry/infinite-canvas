"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App } from "antd";

import { Signup1 } from "@/components/ui/signup-1";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/use-auth-store";

function RegisterForm() {
    const router = useRouter();
    const params = useSearchParams();
    const { message } = App.useApp();
    const register = useAuthStore((s) => s.register);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const redirect = params.get("redirect");
    const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return message.warning("请输入正确的邮箱");
        if (username.trim().length < 2 || username.trim().length > 24) return message.warning("用户名需 2-24 个字符");
        if (password.length < 8) return message.warning("密码至少 8 位");
        setLoading(true);
        try {
            await register(email.trim(), username.trim(), password);
            message.success("注册成功，已自动登录");
            router.replace(decodeURIComponent(redirect || "/"));
        } catch (err) {
            message.error(err instanceof Error ? err.message : "注册失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Signup1
            heading="注册无限画布"
            logo={{ url: "/", src: "/logo.svg", alt: "无限画布", title: "无限画布" }}
            signupText={loading ? "注册中…" : "创建账号"}
            googleText="使用 Google 注册"
            loginText="已有账号？"
            loginUrl={loginHref}
            loginLinkText="登录"
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={onSubmit}
            onGoogle={() => message.info("第三方登录即将支持")}
            loading={loading}
            extraField={
                <Input type="text" placeholder="用户名（2-24 个字符）" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            }
        />
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterForm />
        </Suspense>
    );
}
