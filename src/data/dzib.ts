// Datos semilla de Dzib, copiados tal cual de la app de Muse (getState, 2026-11-21).
// Precios en centavos. NO inventar: el menú de comida de hoy sigue siendo el
// ejemplo del 1 de noviembre (sencillo $45, especial $67) y el agua
// ($15 vaso / $40 jarra 1L / $80 jarra 2.5L) son valores iniciales sin confirmar.
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
  defaultSencilloPriceCents: 4500, // comida sencillo $45 — SIN CONFIRMAR
  defaultSpecialPriceCents: 6700, // comida especial $67 — SIN CONFIRMAR
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

// Menú de comida de EJEMPLO (hoja del 1 de noviembre). En la app de Muse está
// publicado como "hoy" por falta del menú real de hoy; aquí se marca como ejemplo
// y NO como menú vigente. El pollo a la pibil ya se añadió como 3er tiempo.
export const DZIB_DAILY_MENU_EXAMPLE = {
  date: "2026-11-01",
  isExample: true,
  notes:
    "Menú de ejemplo tomado de la hoja del 1 de noviembre. El restaurante lo actualiza cada día en Admin. No incluye agua ni postre.",
  sencilloPriceCents: 4500,
  specialDish: "Pollo a la pibil",
  specialPriceCents: 6700,
  items: [
    { id: 1, name: "Consomé de pollo", tiempo: "primero", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 2, name: "Sopa de higaditos", tiempo: "primero", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 3, name: "Crema de verduras", tiempo: "primero", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 4, name: "Arroz verde", tiempo: "segundo", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 5, name: "Spaghetti a la mantequilla", tiempo: "segundo", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 6, name: "Chilaquiles", tiempo: "segundo", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 7, name: "Verduras", tiempo: "segundo", soloPriceCents: 1500, kitchen: "cocina-a" },
    { id: 8, name: "Cerdo en pipián", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 9, name: "Birria estilo Jalisco", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 10, name: "Pollo a la suiza", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 11, name: "Chalupas de pollo", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 12, name: "Callos a la madrileña", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 13, name: "Tortas de coliflor", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 14, name: "Ensalada César con pollo", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 15, name: "Ensalada mil islas", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 16, name: "Ensalada de espinaca con arándano", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 17, name: "Ensalada de verduras", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
    { id: 18, name: "Pollo a la pibil", tiempo: "tercero", soloPriceCents: 4300, kitchen: "cocina-a" },
  ] as DailyMenuItem[],
};

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
