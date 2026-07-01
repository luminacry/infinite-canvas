"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/use-auth-store";

function RegisterForm() {
    const router = useRouter();
    const params = useSearchParams();
    const register = useAuthStore((s) => s.register);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);

    const redirect = params.get("redirect");
    const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.warning("请输入正确的邮箱");
        if (username.trim().length < 2 || username.trim().length > 24) return toast.warning("用户名需 2-24 个字符");
        if (password.length < 8) return toast.warning("密码至少 8 位");
        setLoading(true);
        try {
            await register(email.trim(), username.trim(), password);
            toast.success("注册成功，已自动登录");
            router.replace(decodeURIComponent(redirect || "/"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "注册失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="items-center text-center">
                <Image src="/logo.svg" alt="无限画布" width={40} height={40} className="mx-auto mb-2 size-10" priority />
                <CardTitle className="text-2xl">注册无限画布</CardTitle>
                <CardDescription>注册即送算力点，开始创作</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email">邮箱</Label>
                        <div className="relative">
                            <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="username">用户名</Label>
                        <div className="relative">
                            <User className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input id="username" placeholder="2-24 个字符" autoComplete="username" className="pl-9" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="password">密码</Label>
                        <div className="relative">
                            <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input id="password" type={showPwd ? "text" : "password"} placeholder="至少 8 位" autoComplete="new-password" className="px-9" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                            <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-muted-foreground hover:text-foreground absolute right-0 top-0 flex h-full w-9 items-center justify-center" tabIndex={-1} aria-label={showPwd ? "隐藏密码" : "显示密码"}>
                                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                    </div>
                    <Button type="submit" className="mt-1 w-full bg-indigo-600 text-white hover:bg-indigo-500" disabled={loading}>
                        {loading ? "注册中…" : "注册"}
                    </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs">或</span>
                    <div className="bg-border h-px flex-1" />
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={() => toast.info("第三方登录即将支持")}>
                    使用 Google 注册
                </Button>

                <p className="text-muted-foreground mt-8 border-t pt-5 text-center text-sm">
                    已有账号？
                    <Link href={loginHref} className="text-primary ml-1 font-medium hover:underline">
                        立即登录
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterForm />
        </Suspense>
    );
}
