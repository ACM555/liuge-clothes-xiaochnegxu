export interface Sku {
  id: string;
  color: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  image: string;
  preview: boolean;
  active: boolean;
  skus: Sku[];
}

export type OrderStatus =
  | "pending_delivery"
  | "delivered"
  | "pending_pickup"
  | "picked_up"
  | "refunded";

export interface Order {
  id: string;
  createdAt: string;
  customerId: string;
  productId: string;
  productName: string;
  image: string;
  skuId: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  total: number;
  fulfillment: "delivery" | "pickup";
  contact: string;
  address: string;
  status: OrderStatus;
  simulated: boolean;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  couponBalance: number;
  commissionBalance: number;
  totalSpent: number;
  referralCode: string;
  favorites: string[];
  ledger: { type: string; amount: number; note: string }[];
}

export interface PreviewNote {
  id: string;
  productId: string;
  productName: string;
  contact: string;
  skuHint: string;
  createdAt: string;
  simulated: boolean;
}

export interface Stats {
  simulated: boolean;
  orders: { total: number; refunded: number; byStatus: Record<string, number> };
  revenueCents: number;
  members: { total: number; note: string };
  distribution: {
    online: { orders: number; commissionCents: number };
    offline: { orders: number; commissionCents: number };
    note: string;
  };
}
