"use client";

import { FcGoogle } from "react-icons/fc";
import type { CSSProperties, FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Signup1Props {
  heading?: string;
  logo: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  signupText?: string;
  googleText?: string;
  loginText?: string;
  loginUrl?: string;
  loginLinkText?: string;
  email?: string;
  password?: string;
  onEmailChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  onSubmit?: (event: FormEvent) => void;
  onGoogle?: () => void;
  loading?: boolean;
  extraField?: ReactNode;
}

// Linear 设计系统精确 token（来源：项目根 DESIGN.md，linear.app）
const linear = {
  base: "rgb(8, 9, 10)", // 页面画布
  card: "rgb(15, 16, 17)", // 卡片表面
  chat: "rgb(22, 23, 24)", // 输入框（暗栈最高层）
  textPrimary: "rgb(247, 248, 248)",
  textSecondary: "rgb(208, 214, 224)",
  textTertiary: "rgb(138, 143, 152)",
  accent: "rgb(94, 106, 210)", // 签名靛蓝
  border: "rgba(255, 255, 255, 0.08)", // 一像素月光
  // 五层复合阴影（卡片抬升）
  cardShadow:
    "rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px",
  featureSettings: '"cv01", "ss03"',
} as const;

export const signupInputStyle: CSSProperties = {
  backgroundColor: linear.chat,
  borderColor: linear.border,
  color: linear.textPrimary,
  borderRadius: 6,
};
const inputStyle = signupInputStyle;

const Signup1 = ({
  heading,
  logo = {
    url: "https://www.shadcnblocks.com",
    src: "https://www.shadcnblocks.com/images/block/logos/shadcnblockscom-wordmark.svg",
    alt: "logo",
    title: "shadcnblocks.com",
  },
  googleText = "Sign up with Google",
  signupText = "Create an account",
  loginText = "Already have an account?",
  loginUrl = "#",
  loginLinkText = "Login",
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  loading = false,
  extraField,
}: Signup1Props) => {
  return (
    <section className="h-screen" style={{ backgroundColor: linear.base, fontFeatureSettings: linear.featureSettings }}>
      <div className="flex h-full items-center justify-center px-4">
        <div
          className="flex w-full max-w-sm flex-col items-center gap-y-8 rounded-lg px-6 py-12"
          style={{ backgroundColor: linear.card, border: `1px solid ${linear.border}`, boxShadow: linear.cardShadow }}
        >
          <div className="flex flex-col items-center gap-y-2">
            {/* Logo */}
            <div className="flex items-center gap-1 lg:justify-start">
              <a href={logo.url}>
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-10 dark:invert"
                />
              </a>
            </div>
            {heading && (
              <h1 className="text-2xl font-medium" style={{ color: linear.textPrimary, letterSpacing: "-0.5px" }}>
                {heading}
              </h1>
            )}
          </div>
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-4">
              {extraField}
              <div className="flex flex-col gap-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => onEmailChange?.(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => onPasswordChange?.(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="mt-2 w-full border-0"
                  style={{ backgroundColor: linear.accent, color: "#fff", borderRadius: 6 }}
                  disabled={loading}
                >
                  {signupText}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  style={{ backgroundColor: "transparent", borderColor: linear.border, color: linear.textSecondary, borderRadius: 6 }}
                  onClick={onGoogle}
                >
                  <FcGoogle className="mr-2 size-5" />
                  {googleText}
                </Button>
              </div>
            </div>
          </form>
          <div className="flex justify-center gap-1 text-sm" style={{ color: linear.textTertiary }}>
            <p>{loginText}</p>
            <a href={loginUrl} className="font-medium hover:underline" style={{ color: linear.accent }}>
              {loginLinkText}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Signup1 };
