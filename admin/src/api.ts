import type { Member, Order, PreviewNote, Product, Stats } from "./types";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && (data as { error?: string }).error) || `请求失败（${res.status}）`);
  }
  return data as T;
}

export const api = {
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
