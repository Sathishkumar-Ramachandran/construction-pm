"use client";
import { create } from "zustand";
import { User, TokenStore, api, APIResponse } from "./api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: () => {
    const user = TokenStore.getUser();
    const token = TokenStore.getAccess();
    if (user && token) {
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const res = await api.postNoAuth<APIResponse<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>>("/auth/login", { email, password });

    if (res.success && res.data) {
      TokenStore.set(res.data.access_token, res.data.refresh_token);
      TokenStore.setUser(res.data.user);
      set({ user: res.data.user, isAuthenticated: true });
    } else {
      throw new Error(res.message || "Login failed");
    }
  },

  logout: async () => {
    const refreshToken = TokenStore.getRefresh();
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Ignore error — clear tokens anyway
      }
    }
    TokenStore.clear();
    set({ user: null, isAuthenticated: false });
  },
}));
