import type { Member, Order, PreviewNote, Product, Stats } from "./types";

export interface Merchant {
  id: string;
  name: string;
  role: string;
  username: string;
  openidBound: boolean;
}

let token = sessionStorage.getItem("merchantToken") || "";

export function getToken(): string {
  return token;
}

export function setToken(value: string): void {
  token = value;
  if (value) sessionStorage.setItem("merchantToken", value);
  else sessionStorage.removeItem("merchantToken");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    headers,
    ...options
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) setToken("");
    throw new Error((data && (data as { error?: string }).error) || `请求失败（${res.status}）`);
  }
  return data as T;
}

export const api = {
  // 认证
  loginWithBindingCode: (code: string) =>
    request<{ token: string; merchant: Merchant }>("/api/auth/binding-code", {
      method: "POST",
      body: JSON.stringify({ code, label: "Web 后台绑定码入口" })
    }),
  loginWithPassword: (username: string, password: string) =>
    request<{ token: string; merchant: Merchant }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  me: () => request<{ merchant: Merchant | null }>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }),
  audit: () => request<{ at: string; action: string; detail: string }[]>("/api/auth/audit"),

  health: () => request<{ ok: boolean; simulated: boolean }>("/api/health"),
  products: (includeInactive = false) =>
    request<Product[]>(`/api/products${includeInactive ? "?includeInactive=1" : ""}`),
  saveProduct: (payload: Partial<Product>, id?: string) =>
    request<{ product: Product }>(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    }),
  orders: () => request<Order[]>("/api/orders"),
  setOrderStatus: (id: string, status: string) =>
    request<{ order: Order }>(`/api/orders/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  member: () => request<Member>("/api/member"),
  previewNotes: () => request<PreviewNote[]>("/api/preview-notes"),
  stats: () => request<Stats>("/api/stats")
};

export function money(cents: number): string {
  return `¥${(Number(cents || 0) / 100).toFixed(2)}`;
}

export const STATUS_TEXT: Record<string, string> = {
  pending_delivery: "待配送",
  delivered: "已配送",
  pending_pickup: "待到店自提",
  picked_up: "已自提",
  refunded: "已退款"
};

export const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  pending_delivery: [
    { label: "标记已配送", status: "delivered" },
    { label: "退款", status: "refunded" }
  ],
  pending_pickup: [
    { label: "标记已自提", status: "picked_up" },
    { label: "退款", status: "refunded" }
  ],
  delivered: [{ label: "退款", status: "refunded" }],
  picked_up: [{ label: "退款", status: "refunded" }],
  refunded: []
};
