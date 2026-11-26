import { DZIB_DAILY_MENU_TODAY } from "@/data/dzib";

export type Role = "cocina" | "mesero" | "caja";
export type OrderItemStatus = "espera" | "pendiente" | "preparando" | "listo" | "entregado" | "cancelado";
export interface OrderItem {
  id: string; name: string; priceCents: number; kitchen: string;
  tiempo?: "primero" | "segundo" | "tercero" | null;
  // Comida corrida a la que pertenece el platillo (1, 2, 3…). Null =
  // pedido por separado. Los ítems viejos sin corrida cuentan como
  // corrida 1 (antes solo se podía pedir una por mesa).
  corrida?: number | null;
  status: OrderItemStatus; qty: number;
  // Indicaciones especiales del comensal para este platillo/tiempo
  // (ej. "sin cebolla y sin cilantro"). Viajan con el platillo y se ven
  // en cocina, meseros, caja y en el status del comensal.
  notes?: string | null;
  // Grupo de lo pedido por separado: "desayuno" = desayuno (sencillo,
  // especial, guisado u otra opción) y null = pedido por separado de
  // comida (plato suelto, agua, extras). Sirve para etiquetarlo como
  // "Desayunos" en vez de "por separado" en la vista del comensal y en
  // cocina. Los tiempos de comida corrida no usan este campo.
  group?: "desayuno" | null;
  // Detalle elegido por el comensal: en desayunos sencillos, la bebida y
  // el acompañamiento ("Café de olla · Jugo de naranja"); en el
  // ingrediente extra, el ingrediente escrito ("queso extra"). No cambia
  // el precio (ya está incluido).
  detail?: string | null;
  // Estación que prepara el ítem (solo Cocuyos: "cocina" = comida,
  // "barra" = bebidas). Dzib no usa este campo.
  station?: "cocina" | "barra" | null;
  // Tipo de ítem: "agua" = agua del día pedida dentro de una comida
  // corrida (llega a cocina JUNTO con el primer tiempo que se pida de
  // esa comida, no por separado). null = platillo normal. El agua se
  // cobra aparte por unidad (precio × qty) AUNQUE la comida sea de 3
  // tiempos: el menú sencillo cubre los platillos, no el agua.
  kind?: "agua" | null;
}
export interface Account {
  id: string; tableId: number; tableLabel: string; items: OrderItem[];
  totalCents: number; status: "abierta" | "cuenta-pedida" | "pagada" | "cerrada";
  payment?: { method: "terminal" | "efectivo"; cashCents?: number } | null;
  // Propina en centavos dejada por el cliente (solo con tarjeta: Caja
  // la escribe al cerrar la cuenta). Se muestra SEPARADA del total de
  // comida en el resumen del día y en la vista de meseros.
  tipCents?: number;
  changeReady?: boolean; kitchenAlert?: boolean;
  // La cerró el mesero (botón "Liberar mesa"): la mesa queda libre para
  // nuevos comensales y caja recibe el aviso. True solo cuando el cierre
  // lo hizo el rol Meseros; Caja cierra sin este flag.
  closedByMesero?: boolean;
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

// Total de UNA comida corrida (sus 3 tiempos): si trae los 3, el precio
// lo define el 3er tiempo; si trae menos, se suma cada uno por separado.
// El agua de la comida (kind "agua") se suma SIEMPRE aparte por unidad,
// porque el menú sencillo no la incluye.
export function corridaGroupTotal(items: OrderItem[]): number {
  const water = items.filter((i) => i.kind === "agua" && i.status !== "cancelado");
  const waterTotal = water.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const course = items.filter((i) => i.kind !== "agua");
  const tiempos = new Set(course.filter((i) => i.tiempo && i.status !== "cancelado").map((i) => i.tiempo));
  if (tiempos.has("primero") && tiempos.has("segundo") && tiempos.has("tercero")) {
    const third = course.find((i) => i.tiempo === "tercero");
    return menuPriceForThird(third?.priceCents ?? 0) + waterTotal;
  }
  return course.filter((i) => i.status !== "cancelado").reduce((s, i) => s + i.priceCents * i.qty, 0) + waterTotal;
}

export function computeTotal(items: OrderItem[]): number {
  // Una corrida por grupo (corrida ?? 1 para los ítems viejos sin grupo).
  const corrida = items.filter((i) => i.tiempo && i.status !== "cancelado");
  const aparte = items.filter((i) => !i.tiempo && i.status !== "cancelado");
  const aparteTotal = aparte.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const groups = new Map<number, OrderItem[]>();
  for (const i of corrida) {
    const g = i.corrida ?? 1;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(i);
  }
  let total = aparteTotal;
  for (const g of groups.values()) total += corridaGroupTotal(g);
  return total;
}

export const STATUS_LABEL: Record<OrderItemStatus, string> = {
  espera: "En espera",
  pendiente: "En cocina",
  preparando: "En preparación",
  listo: "Listo para recoger",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
