"use client";

import { create } from "zustand";
import { authApi, type AuthUser } from "@/services/api/auth";

type AuthState = {
    user: AuthUser | null;
    ready: boolean; // 是否已完成首次 me() 探测
    fetchMe: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    setBalance: (balance: number) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    ready: false,
    fetchMe: async () => {
        try {
            const user = await authApi.me();
            set({ user, ready: true });
        } catch {
            set({ user: null, ready: true });
        }
    },
    login: async (email, password) => {
        const user = await authApi.login(email, password);
        set({ user });
    },
    register: async (email, username, password) => {
        const user = await authApi.register(email, username, password);
        set({ user });
    },
    logout: async () => {
        await authApi.logout();
        set({ user: null });
    },
    setBalance: (balance) => set((s) => (s.user ? { user: { ...s.user, creditBalance: balance } } : s)),
}));
