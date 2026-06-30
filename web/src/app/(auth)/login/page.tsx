"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Card, Form, Input } from "antd";

import { useAuthStore } from "@/stores/use-auth-store";

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const { message } = App.useApp();
    const login = useAuthStore((s) => s.login);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success("登录成功");
            router.replace(decodeURIComponent(params.get("redirect") || "/"));
        } catch (e) {
            message.error(e instanceof Error ? e.message : "登录失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm" title="登录无限画布">
            <Form layout="vertical" onFinish={onFinish} requiredMark={false} disabled={loading}>
                <Form.Item name="email" label="邮箱" rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "邮箱格式不正确" }]}>
                    <Input size="large" placeholder="you@example.com" autoComplete="email" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
                    <Input.Password size="large" placeholder="请输入密码" autoComplete="current-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                    登录
                </Button>
            </Form>
            <div className="mt-4 text-center text-sm text-stone-500">
                还没有账号？
                <Link href="/register" className="ml-1 text-blue-600 hover:underline">
                    注册
                </Link>
            </div>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
