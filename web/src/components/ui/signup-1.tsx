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

// 明暗跟随全站主题（用语义色变量）；仅保留 Linear 签名靛蓝强调色 + 精确阴影。
// 字号用固定 px（Linear 规范），避免受浏览器/系统缩放与 rem 影响。
const ACCENT = "rgb(94, 106, 210)"; // Linear 签名靛蓝
const CARD_SHADOW =
  "rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px";
const FONT_FEATURES = '"cv01", "ss03"';

// 供各页输入框复用（跟随主题，固定 14px 字号）
export const signupInputStyle: CSSProperties = { fontSize: 14, borderRadius: 6 };

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
    <section className="bg-background text-foreground h-screen" style={{ fontFeatureSettings: FONT_FEATURES }}>
      <div className="flex h-full items-center justify-center px-4">
        <div className="bg-card flex w-full max-w-sm flex-col items-center gap-y-8 rounded-lg border px-6 py-12" style={{ boxShadow: CARD_SHADOW }}>
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
              <h1 className="font-medium" style={{ fontSize: 24, lineHeight: "30px", letterSpacing: "-0.5px" }}>
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
                  style={signupInputStyle}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => onPasswordChange?.(e.target.value)}
                  style={signupInputStyle}
                  required
                />
              </div>
              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="mt-2 w-full border-0 text-white hover:opacity-90"
                  style={{ backgroundColor: ACCENT, borderRadius: 6, fontSize: 14 }}
                  disabled={loading}
                >
                  {signupText}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  style={{ borderRadius: 6, fontSize: 14 }}
                  onClick={onGoogle}
                >
                  <FcGoogle className="mr-2 size-5" />
                  {googleText}
                </Button>
              </div>
            </div>
          </form>
          <div className="text-muted-foreground flex justify-center gap-1" style={{ fontSize: 14 }}>
            <p>{loginText}</p>
            <a href={loginUrl} className="font-medium hover:underline" style={{ color: ACCENT }}>
              {loginLinkText}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Signup1 };
