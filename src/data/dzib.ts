// Datos semilla de Dzib, copiados tal cual de la app de Muse (getState, 2026-11-21).
// Precios en centavos. El menú de comida es el de la hoja del restaurante del
// 20 de noviembre de 2026, publicado por Cesar como menú de hoy (21 nov 2026).
// El agua ($15 vaso / $40 jarra 1L / $80 jarra 2.5L) son valores iniciales sin confirmar.
export type Kitchen = "cocina-a" | "cocina-b" | "ambas";
export type BreakfastCategory = "desayuno" | "especial" | "otra" | "extra";

export interface BreakfastItem {
  id: number;
  name: string;
  description: string;
  category: BreakfastCategory;
  priceCents: number;
  kitchen: Kitchen;
  isAvailable: boolean;
}

export const DZIB_SETTINGS = {
  breakfastPriceCents: 8200, // sencillos $82
  breakfastSpecialPriceCents: 9200, // especiales $92
  guisadoDelDia: "Pollo a la pibil",
  guisadoPriceCents: 7800, // guisados $78
  defaultSencilloPriceCents: 9100, // comida sencillo $91 (hoja 20 nov 2026)
  defaultSpecialPriceCents: 7800, // menú de $78 (hoja 20 nov 2026)
  waterGlassPriceCents: 1500, // SIN CONFIRMAR
  waterJar1PriceCents: 4000, // SIN CONFIRMAR
  waterJar25PriceCents: 8000, // SIN CONFIRMAR
  waterFlavor: "",
};

export const DZIB_TABLES = [
  { id: 1, label: "Mesa 1", zone: "restaurante-1" },
  { id: 2, label: "Mesa 2", zone: "restaurante-1" },
  { id: 3, label: "Mesa 3", zone: "restaurante-1" },
  { id: 4, label: "Mesa 4", zone: "restaurante-1" },
  { id: 5, label: "Mesa 5", zone: "restaurante-1" },
  { id: 6, label: "Mesa 6", zone: "restaurante-1" },
  { id: 7, label: "Mesa 1B", zone: "restaurante-2" },
  { id: 8, label: "Mesa 2B", zone: "restaurante-2" },
  { id: 9, label: "Mesa 3B", zone: "restaurante-2" },
  { id: 10, label: "Mesa 4B", zone: "restaurante-2" },
  { id: 11, label: "Mesa 5B", zone: "restaurante-2" },
  { id: 12, label: "Mesa 6B", zone: "restaurante-2" },
];

export const DZIB_BREAKFAST: BreakfastItem[] = [
  // Sencillos $82 — incluyen café de olla o té, y jugo de naranja o fruta (papaya con plátano)
  { id: 24, name: "Huevos estrellados con tocino", description: "2 piezas de huevo y 2 tiras de tocino", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 25, name: "Huevos con jamón", description: "2 piezas de huevos y 2 rebanadas de jamón", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 26, name: "Huevos con nopales", description: "2 piezas de huevo y nopales", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 27, name: "Huevos al albañil", description: "2 piezas de huevo con salsa verde o roja", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 28, name: "Huevos con champiñones", description: "2 piezas de huevo y champiñones", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 29, name: "Huevos con salchicha", description: "2 piezas de huevo y 2 piezas de salchicha", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 30, name: "Huevos con tocino", description: "2 piezas de huevo y 2 tiras de tocino", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 31, name: "Huevos con chorizo", description: "2 piezas de huevos y chorizo", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 32, name: "Huevos rancheros", description: "2 piezas de huevo, 2 tortillas con salsa verde o roja", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 33, name: "Huevos divorciados", description: "2 piezas de huevo, 2 tortillas con salsa verde y roja", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 34, name: "Chilaquiles gratinados", description: "Tortilla dorada y 1 rebanada de manchego", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 35, name: "Chilaquiles con huevo", description: "Tortilla dorada y 2 piezas de huevo", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 36, name: "Omelette de jamón", description: "2 piezas de huevo y 2 rebanadas de jamón", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 37, name: "Omelette de quesillo", description: "2 piezas de huevo y quesillo", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 38, name: "Omelette de champiñones", description: "2 piezas de huevo y champiñones", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 39, name: "Omelette de espinaca", description: "2 piezas de huevo y espinaca", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 40, name: "Sincronizada", description: "3 tortillas de harina, 2 de jamón, quesillo y queso amarillo", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 41, name: "Huevos socorridos", description: "2 piezas de huevo, frijoles y queso blanco, en salsa verde o roja", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 42, name: "Enchiladas con huevo", description: "3 tortillas y 2 huevos, en salsa roja o verde", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 43, name: "Enchiladas con queso", description: "3 tortillas y queso blanco, salsa verde o roja", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 44, name: "Quesadillas de quesillo con espinaca", description: "3 tortillas, quesillo, espinaca y lechuga", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  { id: 45, name: "Huevos montados", description: "2 tortillas, 2 huevos, frijoles y 2 rebanadas de jamón en salsa roja", category: "desayuno", priceCents: 8200, kitchen: "cocina-a", isAvailable: true },
  // Especiales $92
  { id: 46, name: "Omelette de verduras gratinado", description: "2 piezas de huevo, verduras cocidas y manchego", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 47, name: "Huevos con pan tostado", description: "2 panes tostados, 2 huevos, aguacate con ensalada", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 48, name: "Taquitos de jamón", description: "3 tortillas de harina, jamón y quesillo, salsa mexicana", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 49, name: "Burritas", description: "3 tortillas de harina, 3 rebanadas de jamón, quesillo y salsa mexicana", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 50, name: "Enchiladas veracruzanas", description: "3 tortillas fritas, 2 huevos y frijol molido", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 51, name: "Sándwich francés", description: "3 rebanadas de pan, 2 rebanadas de jamón, queso blanco y manchego", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 52, name: "Sándwich de queso", description: "3 rebanadas de pan, queso blanco, queso amarillo, quesillo y manchego", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  { id: 53, name: "Huevos a la mexicana", description: "2 huevos, jitomate, cebolla y chile", category: "especial", priceCents: 9200, kitchen: "cocina-a", isAvailable: true },
  // Otras opciones $120–$140
  { id: 54, name: "Pechuga a la plancha con chilaquiles", description: "", category: "otra", priceCents: 12000, kitchen: "cocina-a", isAvailable: true },
  { id: 55, name: "Pechuga a la plancha con ensalada y papas", description: "", category: "otra", priceCents: 13000, kitchen: "cocina-a", isAvailable: true },
  { id: 56, name: "Pechuga gratinada con chilaquiles", description: "", category: "otra", priceCents: 13000, kitchen: "cocina-a", isAvailable: true },
  { id: 57, name: "Pechuga gratinada con ensalada y papas", description: "", category: "otra", priceCents: 14000, kitchen: "cocina-a", isAvailable: true },
  { id: 58, name: "Pechuga empanizada con chilaquiles", description: "", category: "otra", priceCents: 13000, kitchen: "cocina-a", isAvailable: true },
  { id: 59, name: "Pechuga empanizada con ensalada y papas", description: "", category: "otra", priceCents: 14000, kitchen: "cocina-a", isAvailable: true },
  { id: 60, name: "Carne asada con chilaquiles", description: "", category: "otra", priceCents: 12000, kitchen: "cocina-a", isAvailable: true },
  { id: 61, name: "Carne asada con ensalada y papas", description: "", category: "otra", priceCents: 13000, kitchen: "cocina-a", isAvailable: true },
  { id: 62, name: "Milanesa de res con chilaquiles", description: "", category: "otra", priceCents: 13000, kitchen: "cocina-a", isAvailable: true },
  { id: 63, name: "Milanesa de res con ensalada y papas", description: "", category: "otra", priceCents: 14000, kitchen: "cocina-a", isAvailable: true },
  { id: 64, name: "Bistec a la ranchera", description: "", category: "otra", priceCents: 12000, kitchen: "cocina-a", isAvailable: true },
  { id: 65, name: "Enchiladas de pollo", description: "", category: "otra", priceCents: 12000, kitchen: "cocina-a", isAvailable: true },
  { id: 66, name: "Tacos de pollo", description: "", category: "otra", priceCents: 12000, kitchen: "cocina-a", isAvailable: true },
  // Extras
  { id: 67, name: "Ingrediente extra", description: "", category: "extra", priceCents: 1800, kitchen: "cocina-a", isAvailable: true },
  { id: 68, name: "Huevo extra", description: "", category: "extra", priceCents: 1400, kitchen: "cocina-a", isAvailable: true },
  { id: 69, name: "Jugo de naranja chico", description: "", category: "extra", priceCents: 3000, kitchen: "cocina-a", isAvailable: true },
  { id: 70, name: "Té", description: "", category: "extra", priceCents: 1600, kitchen: "cocina-a", isAvailable: true },
  { id: 71, name: "Pan dulce", description: "", category: "extra", priceCents: 2700, kitchen: "cocina-a", isAvailable: true },
];

export type Tiempo = "primero" | "segundo" | "tercero";
export interface DailyMenuItem {
  id: number;
  name: string;
  tiempo: Tiempo;
  soloPriceCents: number;
  kitchen: Kitchen;
}

// Menú de comida de HOY — sábado 21 de noviembre de 2026, transcrito tal cual
// de la hoja del restaurante (fechada 20 de noviembre de 2026) que Cesar envió.
// Menú sencillo de 3 tiempos $91 (no incluye agua ni postre). Servicio de
// 1:30 pm a 7:00 pm. Todos los precios incluyen IVA.
// El 1er tiempo NO trae precio solo en la hoja: se muestra como parte del
// menú sencillo ($0 en el pedido, se liquida como el sencillo de $91 en caja).
export const DZIB_DAILY_MENU_TODAY = {
  date: "2026-11-21",
  isExample: false,
  notes:
    "Menú sencillo de 3 tiempos $91.00 (no incluye agua ni postre). 2º tiempo solo $26, guisado solo $79, menú de $78. Servicio de 1:30 pm a 7:00 pm. Todos nuestros precios incluyen IVA.",
  sencilloPriceCents: 9100,
  specialDish: "Pollo a la pibil",
  specialPriceCents: 7800,
  items: [
    // 1er tiempo — sin precio solo en la hoja (parte del sencillo $91)
    { id: 1, name: "Caldo de camarón", tiempo: "primero", soloPriceCents: 0, kitchen: "cocina-a" },
    { id: 2, name: "Sopa de pasta", tiempo: "primero", soloPriceCents: 0, kitchen: "cocina-a" },
    { id: 3, name: "Crema de calabaza", tiempo: "primero", soloPriceCents: 0, kitchen: "cocina-a" },
    // 2º tiempo — solo $26
    { id: 4, name: "Arroz con almeja", tiempo: "segundo", soloPriceCents: 2600, kitchen: "cocina-a" },
    { id: 5, name: "Pluma al horno", tiempo: "segundo", soloPriceCents: 2600, kitchen: "cocina-a" },
    { id: 6, name: "Chilaquiles", tiempo: "segundo", soloPriceCents: 2600, kitchen: "cocina-a" },
    { id: 7, name: "Verduras", tiempo: "segundo", soloPriceCents: 2600, kitchen: "cocina-a" },
    // 3er tiempo — solo el guisado $79
    { id: 8, name: "Pescaditos (3 pzas.)", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    { id: 9, name: "Filete de pescado empanizado", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    { id: 10, name: "Sierra a la veracruzana", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    { id: 11, name: "Ceviche de calamar", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    { id: 12, name: "Tostadas de pescado (2 pzas.)", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    { id: 13, name: "Empanada de camarón (1 pza.)", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    { id: 14, name: "Quesadillas de pescado", tiempo: "tercero", soloPriceCents: 7900, kitchen: "cocina-a" },
    // Menú de $78 — 3er tiempo, solo $78
    { id: 15, name: "Pollo a la pibil", tiempo: "tercero", soloPriceCents: 7800, kitchen: "cocina-a" },
    { id: 16, name: "Ensalada César con pollo", tiempo: "tercero", soloPriceCents: 7800, kitchen: "cocina-a" },
    { id: 17, name: "Ensalada mil islas", tiempo: "tercero", soloPriceCents: 7800, kitchen: "cocina-a" },
    { id: 18, name: "Ensalada de espinacas", tiempo: "tercero", soloPriceCents: 7800, kitchen: "cocina-a" },
    { id: 19, name: "Ensalada de verduras (jamón o queso)", tiempo: "tercero", soloPriceCents: 7800, kitchen: "cocina-a" },
    // Platos sueltos de la hoja
    { id: 20, name: "Filete relleno", tiempo: "tercero", soloPriceCents: 17000, kitchen: "cocina-a" },
    { id: 21, name: "Cazuela de mariscos especial", tiempo: "tercero", soloPriceCents: 19000, kitchen: "cocina-a" },
    { id: 22, name: "Cazuela de mariscos", tiempo: "tercero", soloPriceCents: 14000, kitchen: "cocina-a" },
    { id: 23, name: "Sopa de mariscos", tiempo: "tercero", soloPriceCents: 14000, kitchen: "cocina-a" },
    { id: 24, name: "Tostadas de camarón", tiempo: "tercero", soloPriceCents: 17000, kitchen: "cocina-a" },
    { id: 25, name: "Mojarra chica", tiempo: "tercero", soloPriceCents: 14000, kitchen: "cocina-a" },
    { id: 26, name: "Mojarra grande", tiempo: "tercero", soloPriceCents: 18000, kitchen: "cocina-a" },
    { id: 27, name: "Cóctel de camarón", tiempo: "tercero", soloPriceCents: 14000, kitchen: "cocina-a" },
    { id: 28, name: "Cóctel de ostión", tiempo: "tercero", soloPriceCents: 14000, kitchen: "cocina-a" },
    { id: 29, name: "Campechana", tiempo: "tercero", soloPriceCents: 14000, kitchen: "cocina-a" },
  ] as DailyMenuItem[],
};
// Nombre anterior, por compatibilidad con importaciones viejas.
export const DZIB_DAILY_MENU_EXAMPLE = DZIB_DAILY_MENU_TODAY;

export const RESTAURANTS = [
  {
    slug: "dzib",
    name: "Dzib",
    address: "Regina 54, Centro Histórico, CDMX",
    description: "Fonda de cocina casera mexicana. Desayunos fijos y menú del día que cambia a diario.",
    status: "listo" as const,
  },
  {
    slug: "tacos-la-chula",
    name: "Tacos La Chula",
    address: "CDMX — 8 sucursales",
    description: "Taquería 24 horas, tortillas hechas a mano. Carta de 74 platillos.",
    status: "por-cargar" as const,
  },
];
