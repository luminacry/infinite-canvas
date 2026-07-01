"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Card, Divider, Form, Input, Typography } from "antd";
import { GoogleOutlined, LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";

import { useAuthStore } from "@/stores/use-auth-store";

function RegisterForm() {
    const router = useRouter();
    const params = useSearchParams();
    const { message } = App.useApp();
    const register = useAuthStore((s) => s.register);
    const [loading, setLoading] = useState(false);

    const redirect = params.get("redirect");
    const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

    const onFinish = async (values: { email: string; username: string; password: string }) => {
        setLoading(true);
        try {
            await register(values.email.trim(), values.username.trim(), values.password);
            message.success("注册成功，已自动登录");
            router.replace(decodeURIComponent(redirect || "/"));
        } catch (err) {
            message.error(err instanceof Error ? err.message : "注册失败");
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
                        注册无限画布
                    </Typography.Title>
                    <Typography.Text type="secondary">注册即送算力点，开始创作</Typography.Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} requiredMark={false} disabled={loading} size="large">
                    <Form.Item name="email" label="邮箱" rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "邮箱格式不正确" }]}>
                        <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
                    </Form.Item>
                    <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }, { min: 2, max: 24, message: "用户名需 2-24 个字符" }]}>
                        <Input prefix={<UserOutlined />} placeholder="2-24 个字符" autoComplete="username" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }, { min: 8, message: "密码至少 8 位" }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="至少 8 位" autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item className="!mb-0">
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            注册
                        </Button>
                    </Form.Item>
                </Form>

                <Divider plain>
                    <Typography.Text type="secondary" className="text-xs">
                        或
                    </Typography.Text>
                </Divider>

                <Button block icon={<GoogleOutlined />} onClick={() => message.info("第三方登录即将支持")}>
                    使用 Google 注册
                </Button>

                <div className="mt-5 text-center text-sm">
                    <Typography.Text type="secondary">已有账号？</Typography.Text>
                    <Typography.Link href={loginHref} className="ml-1">
                        立即登录
                    </Typography.Link>
                </div>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterForm />
        </Suspense>
    );
}
