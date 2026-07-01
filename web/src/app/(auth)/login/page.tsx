"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Card, Divider, Form, Input, Typography } from "antd";
import { GoogleOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";

import { useAuthStore } from "@/stores/use-auth-store";

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const { message } = App.useApp();
    const login = useAuthStore((s) => s.login);
    const [loading, setLoading] = useState(false);

    const redirect = params.get("redirect");
    const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register";

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            await login(values.email.trim(), values.password);
            message.success("登录成功");
            router.replace(decodeURIComponent(redirect || "/"));
        } catch (err) {
            message.error(err instanceof Error ? err.message : "登录失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
            <Card variant="borderless" className="w-full max-w-sm shadow-lg" styles={{ body: { padding: 32 } }}>
                <div className="mb-6 flex flex-col items-center gap-2">
                    <Image src="/logo.svg" alt="无限画布" width={40} height={40} className="size-10" priority />
                    <Typography.Title level={3} className="!mb-0">
                        登录无限画布
                    </Typography.Title>
                    <Typography.Text type="secondary">更快创作，专注灵感</Typography.Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} requiredMark={false} disabled={loading} size="large">
                    <Form.Item name="email" label="邮箱" rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "邮箱格式不正确" }]}>
                        <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" />
                    </Form.Item>
                    <Form.Item className="!mb-0">
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            登录
                        </Button>
                    </Form.Item>
                </Form>

                <Divider plain>
                    <Typography.Text type="secondary" className="text-xs">
                        或
                    </Typography.Text>
                </Divider>

                <Button block icon={<GoogleOutlined />} onClick={() => message.info("第三方登录即将支持")}>
                    使用 Google 登录
                </Button>

                <div className="mt-5 text-center text-sm">
                    <Typography.Text type="secondary">还没有账号？</Typography.Text>
                    <Typography.Link href={registerHref} className="ml-1">
                        立即注册
                    </Typography.Link>
                </div>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
