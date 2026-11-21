import { DZIB_DAILY_MENU_TODAY } from "@/data/dzib";

export type Role = "cocina" | "mesero" | "caja";
export type OrderItemStatus = "espera" | "pendiente" | "preparando" | "listo" | "entregado" | "cancelado";
export interface OrderItem {
  id: string; name: string; priceCents: number; kitchen: string;
  tiempo?: "primero" | "segundo" | "tercero" | null;
  status: OrderItemStatus; qty: number;
}
export interface Account {
  id: string; tableId: number; tableLabel: string; items: OrderItem[];
  totalCents: number; status: "abierta" | "cuenta-pedida" | "pagada" | "cerrada";
  payment?: { method: "terminal" | "efectivo"; cashCents?: number } | null;
  changeReady?: boolean; kitchenAlert?: boolean;
  // Fecha (México) del corte final en el que se incluyó esta cuenta.
  // Null = todavía no cortada; el resumen del día solo cuenta las no cortadas.
  cutDate?: string | null;
  createdAt: string;
}
export const mxn = (cents: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100);

// Precio de la comida corrida, según la hoja del restaurante:
// EL PRECIO LO DEFINE EL 3ER TIEMPO. La corrida completa (1er + 2º + 3er)
// cuesta lo del menú del 3er tiempo elegido: $91 si el guisado es del
// grupo de $79 (el guisado solo cuesta $79, el menú sencillo completo
// $91), $78 si es del menú de $78 (pollo a la pibil, ensaladas), y el
// precio del especial si es un plato especial ($140–$190). El 1er y el
// 2º tiempo van INCLUIDOS en la corrida. Si el cliente pide menos
// tiempos (sin corrida completa), paga cada uno por separado: 2º tiempo
// solo $26, guisado solo $79 (o su precio solo), 1er tiempo sin precio
// solo en la hoja ($0 por sí solo, se liquida en caja). Todo lo pedido
// por separado (desayunos, agua, extras, platos sueltos) se cobra a su
// precio individual y se suma.
export function menuPriceForThird(soloPriceCents: number): number {
  return soloPriceCents === 7900 ? DZIB_DAILY_MENU_TODAY.sencilloPriceCents : soloPriceCents;
}

export function computeTotal(items: OrderItem[]): number {
  const corrida = items.filter((i) => i.tiempo && i.status !== "cancelado");
  const aparte = items.filter((i) => !i.tiempo && i.status !== "cancelado");
  const aparteTotal = aparte.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const tiempos = new Set(corrida.map((i) => i.tiempo));
  if (tiempos.has("primero") && tiempos.has("segundo") && tiempos.has("tercero")) {
    const third = corrida.find((i) => i.tiempo === "tercero");
    return menuPriceForThird(third?.priceCents ?? 0) + aparteTotal;
  }
  return corrida.reduce((s, i) => s + i.priceCents * i.qty, 0) + aparteTotal;
}

export const STATUS_LABEL: Record<OrderItemStatus, string> = {
  espera: "En espera",
  pendiente: "En cocina",
  preparando: "En preparación",
  listo: "Listo para recoger",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
