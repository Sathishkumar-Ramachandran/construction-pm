/**
 * API client — thin wrapper around fetch pointing to FastAPI backend.
 * Handles JWT token injection and refresh automatically.
 */

const API_BASE = "http://13.206.144.93:8000/api/v1";
//process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
// IP CHANGED
// ─── Token helpers (client-side only) ────────────────────────────────────────

export const TokenStore = {
  getAccess: (): string | null =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  getRefresh: (): string | null =>
    typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null,
  set: (access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },
  getUser: () => {
    if (typeof window === "undefined") return null;
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },
  setUser: (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  company_id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  avatar_path?: string;
  is_active: boolean;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  errors: { field: string; message: string }[];
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  message: string;
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (!(fetchOpts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = TokenStore.getAccess();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${TokenStore.getAccess()}`;
      const retried = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers });
      const data = await retried.json();
      if (!retried.ok) throw new APIError(data.message || "Request failed", retried.status, data);
      return data as T;
    } else {
      TokenStore.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new APIError("Session expired", 401);
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new APIError(data.message || "Request failed", response.status, data);
  }
  return data as T;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = TokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.data?.access_token) {
      localStorage.setItem("access_token", data.data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class APIError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    apiFetch<T>(path, { method: "POST", body: formData }),
  postNoAuth: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), skipAuth: true }),
};
