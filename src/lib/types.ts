export type Role = "cocina" | "mesero" | "caja";
export type OrderItemStatus = "espera" | "pendiente" | "preparando" | "listo" | "entregado" | "cancelado";
export interface OrderItem {
  id: string; name: string; priceCents: number; kitchen: string;
  tiempo?: "primero" | "segundo" | "tercero" | null;
  status: OrderItemStatus; qty: number;
}
export interface Account {
  id: string; tableId: number; tableLabel: string; items: OrderItem[];
  totalCents: number; status: "abierta" | "cuenta-pedida" | "cerrada";
  payment?: { method: "terminal" | "efectivo"; cashCents?: number } | null;
  createdAt: string;
}
export const mxn = (cents: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100);
