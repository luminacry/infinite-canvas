import { api } from "./client";

export type AuthUser = { id: string; email: string; username: string; role: string; creditBalance: number };

export const authApi = {
    register: (email: string, username: string, password: string) => api.post<AuthUser>("/api/auth/register", { email, username, password }),
    login: (email: string, password: string) => api.post<AuthUser>("/api/auth/login", { email, password }),
    logout: () => api.post<null>("/api/auth/logout"),
    me: () => api.get<AuthUser>("/api/auth/me"),
};
