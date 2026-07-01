"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/use-auth-store";

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const login = useAuthStore((s) => s.login);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);

    const redirect = params.get("redirect");
    const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.warning("请输入正确的邮箱");
        if (!password) return toast.warning("请输入密码");
        setLoading(true);
        try {
            await login(email.trim(), password);
            toast.success("登录成功");
            router.replace(decodeURIComponent(redirect || "/"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "登录失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="items-center text-center">
                <Image src="/logo.svg" alt="无限画布" width={40} height={40} className="mx-auto mb-2 size-10" priority />
                <CardTitle className="text-2xl">登录无限画布</CardTitle>
                <CardDescription>更快创作，专注灵感</CardDescription>
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
                        <Label htmlFor="password">密码</Label>
                        <div className="relative">
                            <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input id="password" type={showPwd ? "text" : "password"} placeholder="请输入密码" autoComplete="current-password" className="px-9" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                            <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-muted-foreground hover:text-foreground absolute right-0 top-0 flex h-full w-9 items-center justify-center" tabIndex={-1} aria-label={showPwd ? "隐藏密码" : "显示密码"}>
                                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                    </div>
                    <Button type="submit" className="mt-1 w-full bg-indigo-600 text-white hover:bg-indigo-500" disabled={loading}>
                        {loading ? "登录中…" : "登录"}
                    </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs">或</span>
                    <div className="bg-border h-px flex-1" />
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={() => toast.info("第三方登录即将支持")}>
                    使用 Google 登录
                </Button>

                <p className="text-muted-foreground mt-8 border-t pt-5 text-center text-sm">
                    还没有账号？
                    <Link href={registerHref} className="text-primary ml-1 font-medium hover:underline">
                        立即注册
                    </Link>
                </p>
            </CardContent>
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
