"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Card, Form, Input } from "antd";

import { useAuthStore } from "@/stores/use-auth-store";

export default function RegisterPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const register = useAuthStore((s) => s.register);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { email: string; username: string; password: string }) => {
        setLoading(true);
        try {
            await register(values.email, values.username, values.password);
            message.success("注册成功，已自动登录");
            router.replace("/");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "注册失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm" title="注册无限画布">
            <Form layout="vertical" onFinish={onFinish} requiredMark={false} disabled={loading}>
                <Form.Item name="email" label="邮箱" rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "邮箱格式不正确" }]}>
                    <Input size="large" placeholder="you@example.com" autoComplete="email" />
                </Form.Item>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }, { min: 2, max: 24, message: "用户名需 2-24 个字符" }]}>
                    <Input size="large" placeholder="昵称" autoComplete="username" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }, { min: 8, message: "密码至少 8 位" }]}>
                    <Input.Password size="large" placeholder="至少 8 位" autoComplete="new-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                    注册
                </Button>
            </Form>
            <div className="mt-4 text-center text-sm text-stone-500">
                已有账号？
                <Link href="/login" className="ml-1 text-blue-600 hover:underline">
                    登录
                </Link>
            </div>
        </Card>
    );
}
