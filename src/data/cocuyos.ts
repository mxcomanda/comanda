// Taquería Los Cocuyos — menú transcrito de las fotos del menú impreso
// enviadas por Cesar el 26 nov 2026 (8 fotos: portada, tacos,
// quesadillas/gringas/tortas, alambres/extras, refrescos/aguas, cervezas,
// postres/coctelería-licores, coctelería/sin alcohol).
// Precios en centavos MXN, tal como están impresos.
//
// PRECIOS CONFIRMADOS POR CESAR 2026-11-26 (antes no se leían en las fotos):
// - Gringas: Lengua $110, Bisteck $110, Campechana $80.
// - Quesos fundidos: Cazuela de queso $100, Champiqueso $120,
//   Choriqueso $120, Queso fundido con bistek $150.
//
// LECTURAS APROXIMADAS (confirmar con Cesar):
// - Gringas: "Porciones de proteína: 100…" (cortado; se asume 100 g como
//   en quesadillas).
// - "Matusalem Patino" en la foto es Matusalem Platino (confirmado por Cesar 2026-11-26).
// - Medusa: "Uracazo Azul" en la foto = Curaçao azul.
// - Cervezas: "Por disposición oficial a partir de las 2:00 am / No se
//   vende ninguna bebida alcohólica ni con alimentos" (texto cortado;
//   se resume como venta de alcohol hasta las 2:00 am).
// - Mojito: los ingredientes salen cortados en la foto; la descripción
//   usa solo los fragmentos legibles.
// - Licores: el menú no dice "por copa", pero los precios se entienden
//   por copa; la nota de la categoría lo dice así.
//
// SUPUESTOS DEL SISTEMA (confirmar con Cesar):
// - Mesas 1–10 confirmadas por Cesar 2026-11-26 (por ahora; serán más después).
// - Sin corridas ni tiempos: todo se pide por separado y va directo a
//   cocina (tacos, quesadillas, etc.) o a barra (bebidas), como un pedido
//   normal. El flujo cocina → mesero → caja es el mismo que Dzib.
// - "Orden de 3" es del mismo ingrediente, como dice el menú.

export type CocuyosStation = "cocina" | "barra";
export type CocuyosPath = "comer" | "tomar" | "postres";
export type CocuyosCategoryId =
  | "tacos" | "quesadillas" | "gringas" | "tortas" | "alambres"
  | "extras" | "quesos" | "vegetariano" | "postres"
  | "refrescos" | "aguas" | "cervezas" | "cerveza-extras"
  | "licores" | "cocteles" | "sin-alcohol";

export interface CocuyosCategory {
  id: CocuyosCategoryId;
  path: CocuyosPath;
  nameEs: string;
  nameEn: string;
  noteEs?: string;
  noteEn?: string;
}

export interface CocuyosItem {
  id: number;
  category: CocuyosCategoryId;
  // Categorías extra donde también aparece el platillo (p. ej. el
  // alambre vegetariano vive en Alambres y en Vegetariano). El pedido
  // usa el mismo id, así que no se duplica en cocina ni en la cuenta.
  alsoIn?: CocuyosCategoryId[];
  nameEs: string;
  nameEn: string;
  descEs: string;
  descEn: string;
  // null = precio por confirmar (se muestra, no se puede pedir).
  priceCents: number | null;
  station: CocuyosStation;
  tags?: string[];
}

export const COCUYOS_META = {
  slug: "cocuyos",
  name: "Taquería Los Cocuyos",
  shortName: "Los Cocuyos",
  since: 1990,
  taglineEs: "Los mejores tacos para ti",
  taglineEn: "Best tacos for you",
  distinctionEs: "Bib Gourmand en México — Guía Michelin",
  distinctionEn: "Bib Gourmand in Mexico — Michelin Guide",
  pressEs: "Como en Netflix: La Ruta de la Garnacha y Las Crónicas del Taco",
  pressEn: "As seen on Netflix: La Ruta de la Garnacha and Las Crónicas del Taco",
};

export const COCUYOS_TABLES = [
  { id: 1, label: "Mesa 1", zone: "restaurante-1" },
  { id: 2, label: "Mesa 2", zone: "restaurante-1" },
  { id: 3, label: "Mesa 3", zone: "restaurante-1" },
  { id: 4, label: "Mesa 4", zone: "restaurante-1" },
  { id: 5, label: "Mesa 5", zone: "restaurante-1" },
  { id: 6, label: "Mesa 6", zone: "restaurante-1" },
  { id: 7, label: "Mesa 7", zone: "restaurante-1" },
  { id: 8, label: "Mesa 8", zone: "restaurante-1" },
  { id: 9, label: "Mesa 9", zone: "restaurante-1" },
  { id: 10, label: "Mesa 10", zone: "restaurante-1" },
];

export const COCUYOS_CATEGORIES: CocuyosCategory[] = [
  { id: "tacos", path: "comer", nameEs: "Tacos", nameEn: "Tacos", noteEs: "Con tortillas de maíz · Porción de proteína: 60 g · Orden de 3 del mismo ingrediente", noteEn: "Corn tortillas · Protein portion: 60 g · Order of 3, same filling" },
  { id: "quesadillas", path: "comer", nameEs: "Quesadillas", nameEn: "Quesadillas", noteEs: "Tortilla de harina · Porción de proteína: 100 g", noteEn: "Flour tortilla · Protein portion: 100 g" },
  { id: "gringas", path: "comer", nameEs: "Gringas", nameEn: "Gringas", noteEs: "Tortilla de harina · Porción de proteína: 100 g", noteEn: "Flour tortilla · Protein portion: 100 g" },
  { id: "tortas", path: "comer", nameEs: "Tortas", nameEn: "Tortas", noteEs: "Porción de proteína: 120 g · Las de pechuga llevan mayonesa, aguacate y jitomate", noteEn: "Protein portion: 120 g · Chicken ones come with mayo, avocado and tomato" },
  { id: "alambres", path: "comer", nameEs: "Alambres", nameEn: "Alambres", noteEs: "Pimiento morrón, cebolla, tocino, queso Oaxaca y carne a su elección", noteEn: "Bell pepper, onion, bacon, Oaxaca cheese and your choice of meat" },
  { id: "extras", path: "comer", nameEs: "Órdenes extras", nameEn: "Extra orders", noteEs: "Para acompañar tus tacos", noteEn: "To go with your tacos" },
  { id: "quesos", path: "comer", nameEs: "Quesos fundidos", nameEn: "Melted cheese", noteEs: "Quesos fundidos al momento, el toque perfecto para tu taco", noteEn: "Cheese melted to order, the perfect touch for your taco" },
  { id: "vegetariano", path: "comer", nameEs: "Opción vegetariana", nameEn: "Vegetarian option", noteEs: "Sin carne, con todo el sabor", noteEn: "No meat, all the flavor" },
  { id: "postres", path: "postres", nameEs: "Postres", nameEn: "Desserts" },
  { id: "refrescos", path: "tomar", nameEs: "Refrescos", nameEn: "Soft drinks" },
  { id: "aguas", path: "tomar", nameEs: "Aguas frescas", nameEn: "Fresh waters", noteEs: "Chica 450 ml · $40 · Grande 950 ml · $75", noteEn: "Small 450 ml · $40 · Large 950 ml · $75" },
  { id: "cervezas", path: "tomar", nameEs: "Cervezas", nameEn: "Beer", noteEs: "Venta de alcohol hasta las 2:00 am, por disposición oficial", noteEn: "Alcohol sold until 2:00 am, by official regulation" },
  { id: "cerveza-extras", path: "tomar", nameEs: "Súmale a tu cerveza", nameEn: "Dress up your beer", noteEs: "Precio extra sobre tu cerveza", noteEn: "Extra charge on top of your beer" },
  { id: "licores", path: "tomar", nameEs: "Licores", nameEn: "Spirits", noteEs: "Precios por copa", noteEn: "Prices per drink" },
  { id: "cocteles", path: "tomar", nameEs: "Coctelería", nameEn: "Cocktails" },
  { id: "sin-alcohol", path: "tomar", nameEs: "Sin alcohol", nameEn: "Non-alcoholic" },
];

export const COCUYOS_MENU: CocuyosItem[] = [
  // ---------- TACOS (tortilla de maíz, $30 c/u; orden de 3 del mismo ingrediente $75) ----------
  { id: 1001, category: "tacos", nameEs: "Taco de suadero", nameEn: "Suadero taco", descEs: "Suadero", descEn: "Brisket", priceCents: 3000, station: "cocina" },
  { id: 1002, category: "tacos", nameEs: "Orden de 3 tacos de suadero", nameEn: "Order of 3 suadero tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1003, category: "tacos", nameEs: "Taco de surtida", nameEn: "Surtida taco", descEs: "Cabeza de res (mixture)", descEn: "Mixed beef head", priceCents: 3000, station: "cocina" },
  { id: 1004, category: "tacos", nameEs: "Orden de 3 tacos de surtida", nameEn: "Order of 3 surtida tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1005, category: "tacos", nameEs: "Taco de cabeza", nameEn: "Cabeza taco", descEs: "Cabeza de res", descEn: "Beef head", priceCents: 3000, station: "cocina" },
  { id: 1006, category: "tacos", nameEs: "Orden de 3 tacos de cabeza", nameEn: "Order of 3 cabeza tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1007, category: "tacos", nameEs: "Taco de tripa", nameEn: "Tripe taco", descEs: "Tripa", descEn: "Tripe", priceCents: 3000, station: "cocina" },
  { id: 1008, category: "tacos", nameEs: "Orden de 3 tacos de tripa", nameEn: "Order of 3 tripe tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1009, category: "tacos", nameEs: "Taco campechano", nameEn: "Campechano taco", descEs: "Suadero con longaniza", descEn: "Brisket with sausage", priceCents: 3000, station: "cocina" },
  { id: 1010, category: "tacos", nameEs: "Orden de 3 tacos campechanos", nameEn: "Order of 3 campechano tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1011, category: "tacos", nameEs: "Taco de cachete", nameEn: "Cachete taco", descEs: "Cachete", descEn: "Cheek", priceCents: 3000, station: "cocina" },
  { id: 1012, category: "tacos", nameEs: "Orden de 3 tacos de cachete", nameEn: "Order of 3 cachete tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1013, category: "tacos", nameEs: "Taco de tronco de oreja", nameEn: "Tronco de oreja taco", descEs: "Tronco de oreja", descEn: "Ear trunk", priceCents: 3000, station: "cocina" },
  { id: 1014, category: "tacos", nameEs: "Orden de 3 tacos de tronco de oreja", nameEn: "Order of 3 tronco de oreja tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1015, category: "tacos", nameEs: "Taco de molleja", nameEn: "Molleja taco", descEs: "Molleja", descEn: "Gizzard", priceCents: 3000, station: "cocina" },
  { id: 1016, category: "tacos", nameEs: "Orden de 3 tacos de molleja", nameEn: "Order of 3 molleja tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1017, category: "tacos", nameEs: "Taco de maciza", nameEn: "Maciza taco", descEs: "Maciza", descEn: "Loin", priceCents: 3000, station: "cocina" },
  { id: 1018, category: "tacos", nameEs: "Orden de 3 tacos de maciza", nameEn: "Order of 3 maciza tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1019, category: "tacos", nameEs: "Taco de trompa", nameEn: "Trompa taco", descEs: "Trompa", descEn: "Snout", priceCents: 3000, station: "cocina" },
  { id: 1020, category: "tacos", nameEs: "Orden de 3 tacos de trompa", nameEn: "Order of 3 trompa tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1021, category: "tacos", nameEs: "Taco de ojo", nameEn: "Ojo taco", descEs: "Ojo", descEn: "Eye", priceCents: 3000, station: "cocina" },
  { id: 1022, category: "tacos", nameEs: "Orden de 3 tacos de ojo", nameEn: "Order of 3 ojo tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  { id: 1023, category: "tacos", nameEs: "Taco de pastor", nameEn: "Pastor taco", descEs: "Pastor", descEn: "Marinated pork", priceCents: 3000, station: "cocina" },
  { id: 1024, category: "tacos", nameEs: "Orden de 3 tacos de pastor", nameEn: "Order of 3 pastor tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 7500, station: "cocina" },
  // Tacos especiales (precio por unidad y orden de 3 propios)
  { id: 1025, category: "tacos", nameEs: "Taco de bisteck", nameEn: "Bisteck taco", descEs: "Bisteck con nopales y aguacate", descEn: "Steak with cactus and avocado", priceCents: 4200, station: "cocina" },
  { id: 1026, category: "tacos", nameEs: "Orden de 3 tacos de bisteck", nameEn: "Order of 3 bisteck tacos", descEs: "Con nopales y aguacate, del mismo ingrediente", descEn: "With cactus and avocado, same filling", priceCents: 12000, station: "cocina" },
  { id: 1027, category: "tacos", nameEs: "Taco de lengua o sesos", nameEn: "Lengua or sesos taco", descEs: "Lengua o sesos", descEn: "Tongue or brains", priceCents: 3200, station: "cocina" },
  { id: 1028, category: "tacos", nameEs: "Orden de 3 tacos de lengua o sesos", nameEn: "Order of 3 lengua or sesos tacos", descEs: "Del mismo ingrediente", descEn: "Same filling", priceCents: 9000, station: "cocina" },
  { id: 1029, category: "tacos", nameEs: "Taco de pechuga asada", nameEn: "Pechuga asada taco", descEs: "Pechuga asada con aguacate y nopal", descEn: "Grilled chicken fillet with avocado and cactus", priceCents: 3500, station: "cocina" },
  { id: 1030, category: "tacos", nameEs: "Orden de 3 tacos de pechuga asada", nameEn: "Order of 3 pechuga asada tacos", descEs: "Con aguacate y nopal, del mismo ingrediente", descEn: "With avocado and cactus, same filling", priceCents: 10000, station: "cocina" },
  { id: 1031, category: "tacos", nameEs: "Taco de pechuga empanizada", nameEn: "Pechuga empanizada taco", descEs: "Pechuga empanizada con aguacate", descEn: "Breaded chicken with avocado", priceCents: 4200, station: "cocina" },
  { id: 1032, category: "tacos", nameEs: "Orden de 3 tacos de pechuga empanizada", nameEn: "Order of 3 pechuga empanizada tacos", descEs: "Con aguacate, del mismo ingrediente", descEn: "With avocado, same filling", priceCents: 12000, station: "cocina" },
  // ---------- QUESADILLAS (tortilla de harina, proteína 100 g) ----------
  { id: 1033, category: "quesadillas", nameEs: "Quesadilla de pechuga asada", nameEn: "Pechuga asada quesadilla", descEs: "Pechuga asada", descEn: "Grilled chicken breast", priceCents: 6500, station: "cocina" },
  { id: 1034, category: "quesadillas", nameEs: "Quesadilla de bistek", nameEn: "Bistek quesadilla", descEs: "Bistek", descEn: "Steak", priceCents: 7000, station: "cocina" },
  { id: 1035, category: "quesadillas", alsoIn: ["vegetariano"], nameEs: "Quesadilla de champiñón", nameEn: "Mushroom quesadilla", descEs: "Champiñón", descEn: "Mushroom", priceCents: 6000, station: "cocina", tags: ["vegetariano"] },
  { id: 1036, category: "quesadillas", alsoIn: ["vegetariano"], nameEs: "Quesadilla de nopal", nameEn: "Nopal quesadilla", descEs: "Nopal", descEn: "Cactus", priceCents: 6000, station: "cocina", tags: ["vegetariano"] },
  { id: 1037, category: "quesadillas", nameEs: "Quesadilla de pastor", nameEn: "Pastor quesadilla", descEs: "Pastor", descEn: "Marinated pork", priceCents: 6000, station: "cocina" },
  { id: 1038, category: "quesadillas", nameEs: "Quesadilla de suadero", nameEn: "Suadero quesadilla", descEs: "Suadero", descEn: "Brisket", priceCents: 6000, station: "cocina" },
  // ---------- GRINGAS (tortilla de harina, proteína 100 g) ----------
  { id: 1039, category: "gringas", nameEs: "Gringa de pastor o suadero", nameEn: "Pastor or suadero gringa", descEs: "Pastor o suadero", descEn: "Marinated pork or brisket", priceCents: 8000, station: "cocina" },
  { id: 1040, category: "gringas", nameEs: "Gringa de lengua", nameEn: "Lengua gringa", descEs: "Lengua", descEn: "Tongue", priceCents: 11000, station: "cocina" },
  { id: 1041, category: "gringas", nameEs: "Gringa de bisteck", nameEn: "Bisteck gringa", descEs: "Bisteck", descEn: "Steak", priceCents: 11000, station: "cocina" },
  { id: 1042, category: "gringas", nameEs: "Gringa campechana", nameEn: "Campechana gringa", descEs: "Suadero con longaniza", descEn: "Brisket with sausage", priceCents: 8000, station: "cocina" },
  { id: 1043, category: "gringas", nameEs: "Gringa de tripa", nameEn: "Tripe gringa", descEs: "Tripa", descEn: "Tripe", priceCents: 8000, station: "cocina" },
  { id: 1044, category: "gringas", nameEs: "Gringa de longaniza", nameEn: "Longaniza gringa", descEs: "Longaniza", descEn: "Sausage", priceCents: 8000, station: "cocina" },
  { id: 1045, category: "gringas", nameEs: "Gringa de pechuga empanizada", nameEn: "Pechuga empanizada gringa", descEs: "Pechuga empanizada", descEn: "Breaded chicken", priceCents: 11000, station: "cocina" },
  { id: 1046, category: "gringas", nameEs: "Gringa de pechuga asada", nameEn: "Pechuga asada gringa", descEs: "Pechuga asada", descEn: "Grilled chicken fillet", priceCents: 10000, station: "cocina" },
  // ---------- TORTAS (proteína 120 g) ----------
  { id: 1047, category: "tortas", nameEs: "Torta de lengua", nameEn: "Lengua torta", descEs: "Lengua", descEn: "Tongue", priceCents: 13000, station: "cocina" },
  { id: 1048, category: "tortas", nameEs: "Torta de pastor o suadero", nameEn: "Pastor or suadero torta", descEs: "Pastor o suadero", descEn: "Marinated pork or brisket", priceCents: 8000, station: "cocina" },
  { id: 1049, category: "tortas", nameEs: "Torta campechana", nameEn: "Campechana torta", descEs: "Suadero con longaniza", descEn: "Brisket with sausage", priceCents: 8000, station: "cocina" },
  { id: 1050, category: "tortas", nameEs: "Torta de tripa", nameEn: "Tripe torta", descEs: "Tripa", descEn: "Tripe", priceCents: 8000, station: "cocina" },
  { id: 1051, category: "tortas", nameEs: "Torta de longaniza", nameEn: "Longaniza torta", descEs: "Longaniza", descEn: "Sausage", priceCents: 8000, station: "cocina" },
  { id: 1052, category: "tortas", nameEs: "Torta de bisteck", nameEn: "Bisteck torta", descEs: "Bisteck", descEn: "Steak", priceCents: 13000, station: "cocina" },
  { id: 1053, category: "tortas", nameEs: "Torta de pechuga asada", nameEn: "Pechuga asada torta", descEs: "Pechuga asada · Lleva mayonesa, aguacate y jitomate", descEn: "Grilled chicken fillet · With mayo, avocado and tomato", priceCents: 11000, station: "cocina" },
  { id: 1054, category: "tortas", nameEs: "Torta de pechuga empanizada", nameEn: "Pechuga empanizada torta", descEs: "Pechuga empanizada · Lleva mayonesa, aguacate y jitomate", descEn: "Breaded chicken · With mayo, avocado and tomato", priceCents: 13000, station: "cocina" },
  // ---------- ALAMBRES ----------
  { id: 1055, category: "alambres", nameEs: "Alambre de pastor", nameEn: "Pastor alambre", descEs: "Pastor", descEn: "Marinated pork", priceCents: 24000, station: "cocina" },
  { id: 1056, category: "alambres", nameEs: "Alambre de suadero", nameEn: "Suadero alambre", descEs: "Suadero", descEn: "Brisket", priceCents: 24000, station: "cocina" },
  { id: 1057, category: "alambres", nameEs: "Alambre campechano", nameEn: "Campechano alambre", descEs: "Suadero con longaniza", descEn: "Brisket with sausage", priceCents: 24000, station: "cocina" },
  { id: 1058, category: "alambres", nameEs: "Alambre de bisteck", nameEn: "Bisteck alambre", descEs: "Bisteck", descEn: "Steak", priceCents: 28000, station: "cocina" },
  { id: 1059, category: "alambres", nameEs: "Alambre de pechuga asada", nameEn: "Pechuga asada alambre", descEs: "Pechuga asada", descEn: "Grilled chicken", priceCents: 26000, station: "cocina" },
  { id: 1060, category: "alambres", alsoIn: ["vegetariano"], nameEs: "Alambre vegetariano", nameEn: "Vegetarian alambre", descEs: "Pimiento morrón, cebolla, nopal y champiñones · Opcional: queso Oaxaca", descEn: "Bell pepper, onion, cactus and mushrooms · Optional: Oaxaca cheese", priceCents: 20000, station: "cocina", tags: ["vegetariano"] },
  // ---------- ÓRDENES EXTRAS ----------
  { id: 1061, category: "extras", nameEs: "Cebollitas", nameEn: "Grilled spring onions", descEs: "Orden de 100 g", descEn: "100 g order", priceCents: 4000, station: "cocina" },
  { id: 1062, category: "extras", nameEs: "Nopales", nameEn: "Nopales", descEs: "Orden de 100 g", descEn: "100 g order", priceCents: 4000, station: "cocina" },
  { id: 1063, category: "extras", nameEs: "Orden de totopos", nameEn: "Tortilla chips order", descEs: "Totopos", descEn: "Tortilla chips", priceCents: 2000, station: "cocina" },
  { id: 1064, category: "extras", nameEs: "Cebollitas con nopales", nameEn: "Spring onions with nopales", descEs: "Orden de 200 g", descEn: "200 g order", priceCents: 7000, station: "cocina" },
  { id: 1065, category: "extras", nameEs: "Papas a la francesa", nameEn: "French fries", descEs: "Orden de 180 g", descEn: "180 g order", priceCents: 7000, station: "cocina" },
  { id: 1066, category: "extras", nameEs: "Frijoles charros", nameEn: "Charro beans", descEs: "Frijoles charros", descEn: "Charro beans", priceCents: 4000, station: "cocina" },
  { id: 1067, category: "extras", nameEs: "Aguacate", nameEn: "Avocado", descEs: "1 pieza", descEn: "1 piece", priceCents: 5000, station: "cocina" },
  { id: 1068, category: "extras", nameEs: "Orden de guacamole", nameEn: "Guacamole order", descEs: "Orden de 200 g", descEn: "200 g order", priceCents: 8000, station: "cocina" },
  { id: 1069, category: "extras", nameEs: "Orden de piña", nameEn: "Pineapple order", descEs: "Orden de 120 g", descEn: "120 g order", priceCents: 2500, station: "cocina" },
  { id: 1070, category: "extras", nameEs: "Tortilla", nameEn: "Tortilla", descEs: "Orden de 150 g", descEn: "150 g order", priceCents: 2000, station: "cocina" },
  { id: 1071, category: "extras", nameEs: "Tortilla de harina", nameEn: "Flour tortilla", descEs: "3 piezas", descEn: "3 pieces", priceCents: 2000, station: "cocina" },
  { id: 1072, category: "extras", nameEs: "Queso extra para taco", nameEn: "Extra cheese for taco", descEs: "Ponle queso a tu taco", descEn: "Add cheese to your taco", priceCents: 1000, station: "cocina" },
  { id: 1073, category: "extras", nameEs: "Queso extra para alambre", nameEn: "Extra cheese for alambre", descEs: "Queso extra", descEn: "Extra cheese", priceCents: 3000, station: "cocina" },
  { id: 1074, category: "extras", nameEs: "Queso extra para torta", nameEn: "Extra cheese for torta", descEs: "Queso extra", descEn: "Extra cheese", priceCents: 2000, station: "cocina" },
  { id: 1075, category: "extras", nameEs: "Queso extra para papas", nameEn: "Extra cheese for fries", descEs: "Queso extra", descEn: "Extra cheese", priceCents: 2000, station: "cocina" },
  // ---------- QUESOS FUNDIDOS AL MOMENTO ----------
  { id: 1076, category: "quesos", nameEs: "Cazuela de queso", nameEn: "Cheese casserole", descEs: "Queso fundido en cazuela", descEn: "Melted cheese in a casserole dish", priceCents: 10000, station: "cocina" },
  { id: 1077, category: "quesos", nameEs: "Champiqueso", nameEn: "Champiqueso", descEs: "Queso fundido con champiñones", descEn: "Melted cheese with mushrooms", priceCents: 12000, station: "cocina" },
  { id: 1078, category: "quesos", nameEs: "Choriqueso", nameEn: "Choriqueso", descEs: "Queso fundido con chorizo", descEn: "Melted cheese with chorizo", priceCents: 12000, station: "cocina" },
  { id: 1079, category: "quesos", nameEs: "Queso fundido con bistek", nameEn: "Melted cheese with steak", descEs: "Queso fundido con bistek", descEn: "Melted cheese with steak", priceCents: 15000, station: "cocina" },
  // ---------- POSTRES ($55 c/u; pasteles $65) ----------
  { id: 1080, category: "postres", nameEs: "Gelatina de yogurt", nameEn: "Yogurt jelly", descEs: "Gelatina de yogurt", descEn: "Yogurt jelly", priceCents: 5500, station: "cocina" },
  { id: 1081, category: "postres", nameEs: "Arroz con leche", nameEn: "Rice pudding", descEs: "Arroz con leche", descEn: "Rice pudding", priceCents: 5500, station: "cocina" },
  { id: 1082, category: "postres", nameEs: "Ensalada de manzana", nameEn: "Apple salad", descEs: "Ensalada de manzana", descEn: "Apple salad", priceCents: 5500, station: "cocina" },
  { id: 1083, category: "postres", nameEs: "Fresas con crema", nameEn: "Strawberries with cream", descEs: "Fresas con crema", descEn: "Strawberries with cream", priceCents: 5500, station: "cocina" },
  { id: 1084, category: "postres", nameEs: "Uvas con queso Philadelphia", nameEn: "Grapes with cream cheese", descEs: "Uvas con queso Philadelphia", descEn: "Grapes with cream cheese", priceCents: 5500, station: "cocina" },
  { id: 1085, category: "postres", nameEs: "Flan napolitano", nameEn: "Neapolitan flan", descEs: "Flan napolitano", descEn: "Neapolitan flan", priceCents: 5500, station: "cocina" },
  { id: 1086, category: "postres", nameEs: "Tapioca", nameEn: "Tapioca", descEs: "Tapioca", descEn: "Tapioca", priceCents: 5500, station: "cocina" },
  { id: 1087, category: "postres", nameEs: "Flan de vainilla", nameEn: "Vanilla flan", descEs: "Flan de vainilla", descEn: "Vanilla flan", priceCents: 5500, station: "cocina" },
  { id: 1088, category: "postres", nameEs: "Carlota de limón", nameEn: "Lemon charlotte", descEs: "Carlota de limón", descEn: "Lemon charlotte", priceCents: 5500, station: "cocina" },
  { id: 1089, category: "postres", nameEs: "Pasteles", nameEn: "Cakes", descEs: "Pastel", descEn: "Cake", priceCents: 6500, station: "cocina" },
  { id: 1090, category: "postres", nameEs: "Café y té", nameEn: "Coffee and tea", descEs: "Café soluble y té", descEn: "Instant coffee and tea", priceCents: 3500, station: "barra" },

  // ---------- REFRESCOS 355 ml ($40) ----------
  { id: 1101, category: "refrescos", nameEs: "Coca-Cola 355 ml", nameEn: "Coca-Cola 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1102, category: "refrescos", nameEs: "Coca-Cola Light 355 ml", nameEn: "Coca-Cola Light 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1103, category: "refrescos", nameEs: "Coca-Cola Sin Azúcar 355 ml", nameEn: "Coca-Cola Zero Sugar 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1104, category: "refrescos", nameEs: "Sprite 355 ml", nameEn: "Sprite 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1105, category: "refrescos", nameEs: "Fanta 355 ml", nameEn: "Fanta 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1106, category: "refrescos", nameEs: "Sidral Mundet 355 ml", nameEn: "Sidral Mundet 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1107, category: "refrescos", nameEs: "Sangría Mundet 355 ml", nameEn: "Sangría Mundet 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1108, category: "refrescos", nameEs: "Mundet Rojo 355 ml", nameEn: "Mundet Rojo 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1109, category: "refrescos", nameEs: "Ciel Mineralizada 355 ml", nameEn: "Ciel sparkling water 355 ml", descEs: "Agua mineral 355 ml", descEn: "355 ml sparkling water", priceCents: 4000, station: "barra" },
  { id: 1110, category: "refrescos", nameEs: "Fresca 355 ml", nameEn: "Fresca 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1111, category: "refrescos", nameEs: "Valle Frut Mango 355 ml", nameEn: "Valle Frut Mango 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1112, category: "refrescos", nameEs: "Valle Frut Guayaba 355 ml", nameEn: "Valle Frut Guava 355 ml", descEs: "Refresco 355 ml", descEn: "355 ml soft drink", priceCents: 4000, station: "barra" },
  { id: 1113, category: "refrescos", nameEs: "Botella de agua 355 ml", nameEn: "Bottled water 355 ml", descEs: "Agua 355 ml", descEn: "355 ml water", priceCents: 4000, station: "barra" },
  // ---------- REFRESCOS 600 ml ($45) ----------
  { id: 1114, category: "refrescos", nameEs: "Coca-Cola 600 ml", nameEn: "Coca-Cola 600 ml", descEs: "Refresco 600 ml", descEn: "600 ml soft drink", priceCents: 4500, station: "barra" },
  { id: 1115, category: "refrescos", nameEs: "Senzao 600 ml", nameEn: "Senzao 600 ml", descEs: "Refresco 600 ml", descEn: "600 ml soft drink", priceCents: 4500, station: "barra" },
  { id: 1116, category: "refrescos", nameEs: "Delaware Punch 600 ml", nameEn: "Delaware Punch 600 ml", descEs: "Refresco 600 ml", descEn: "600 ml soft drink", priceCents: 4500, station: "barra" },
  { id: 1117, category: "refrescos", nameEs: "Sidral Mundet 600 ml", nameEn: "Sidral Mundet 600 ml", descEs: "Refresco 600 ml", descEn: "600 ml soft drink", priceCents: 4500, station: "barra" },
  // ---------- AGUAS FRESCAS (chica 450 ml $40; grande 950 ml $75) ----------
  { id: 1118, category: "aguas", nameEs: "Agua de horchata chica", nameEn: "Small horchata", descEs: "Horchata · 450 ml", descEn: "Horchata · 450 ml", priceCents: 4000, station: "barra" },
  { id: 1119, category: "aguas", nameEs: "Agua de horchata grande", nameEn: "Large horchata", descEs: "Horchata · 950 ml", descEn: "Horchata · 950 ml", priceCents: 7500, station: "barra" },
  { id: 1120, category: "aguas", nameEs: "Agua de jamaica chica", nameEn: "Small jamaica", descEs: "Jamaica · 450 ml", descEn: "Hibiscus · 450 ml", priceCents: 4000, station: "barra" },
  { id: 1121, category: "aguas", nameEs: "Agua de jamaica grande", nameEn: "Large jamaica", descEs: "Jamaica · 950 ml", descEn: "Hibiscus · 950 ml", priceCents: 7500, station: "barra" },
  { id: 1122, category: "aguas", nameEs: "Agua de tamarindo chica", nameEn: "Small tamarind", descEs: "Tamarindo · 450 ml", descEn: "Tamarind · 450 ml", priceCents: 4000, station: "barra" },
  { id: 1123, category: "aguas", nameEs: "Agua de tamarindo grande", nameEn: "Large tamarind", descEs: "Tamarindo · 950 ml", descEn: "Tamarind · 950 ml", priceCents: 7500, station: "barra" },
  // ---------- CERVEZAS ----------
  { id: 1124, category: "cervezas", nameEs: "Corona", nameEn: "Corona", descEs: "Cerveza", descEn: "Beer", priceCents: 5000, station: "barra" },
  { id: 1125, category: "cervezas", nameEs: "Victoria", nameEn: "Victoria", descEs: "Cerveza", descEn: "Beer", priceCents: 5000, station: "barra" },
  { id: 1126, category: "cervezas", nameEs: "Pacífico", nameEn: "Pacífico", descEs: "Cerveza", descEn: "Beer", priceCents: 5000, station: "barra" },
  { id: 1127, category: "cervezas", nameEs: "Negra Modelo", nameEn: "Negra Modelo", descEs: "Cerveza", descEn: "Beer", priceCents: 6000, station: "barra" },
  { id: 1128, category: "cervezas", nameEs: "Modelo Especial", nameEn: "Modelo Especial", descEs: "Cerveza", descEn: "Beer", priceCents: 6000, station: "barra" },
  { id: 1129, category: "cervezas", nameEs: "Stella Artois", nameEn: "Stella Artois", descEs: "Cerveza", descEn: "Beer", priceCents: 6000, station: "barra" },
  { id: 1130, category: "cervezas", nameEs: "Michelob Ultra", nameEn: "Michelob Ultra", descEs: "Cerveza", descEn: "Beer", priceCents: 6000, station: "barra" },
  // ---------- SÚMALE A TU CERVEZA (extra sobre la cerveza) ----------
  { id: 1131, category: "cerveza-extras", nameEs: "Michelada", nameEn: "Michelada", descEs: "Sal y limón", descEn: "Salt and lime", priceCents: 2000, station: "barra" },
  { id: 1132, category: "cerveza-extras", nameEs: "Cubana", nameEn: "Cubana", descEs: "Limón, Maggi, salsa inglesa, Tabasco y Tajín", descEn: "Lime, Maggi, Worcestershire sauce, Tabasco and Tajín", priceCents: 2500, station: "barra" },
  { id: 1133, category: "cerveza-extras", nameEs: "Chelada", nameEn: "Chelada", descEs: "Limón, salsas y Tajín", descEn: "Lime, sauces and Tajín", priceCents: 3000, station: "barra" },
  { id: 1134, category: "cerveza-extras", nameEs: "Clamato", nameEn: "Clamato", descEs: "Limón, Tajín, salsas y clamato", descEn: "Lime, Tajín, sauces and Clamato", priceCents: 5000, station: "barra" },
  // ---------- LICORES (por copa) — RONES ----------
  { id: 1135, category: "licores", nameEs: "Bacardí Solera", nameEn: "Bacardí Solera", descEs: "Ron", descEn: "Rum", priceCents: 11500, station: "barra" },
  { id: 1136, category: "licores", nameEs: "Bacardí Blanco", nameEn: "Bacardí Blanco", descEs: "Ron", descEn: "Rum", priceCents: 11000, station: "barra" },
  { id: 1137, category: "licores", nameEs: "Bacardí Añejo", nameEn: "Bacardí Añejo", descEs: "Ron", descEn: "Rum", priceCents: 11000, station: "barra" },
  { id: 1138, category: "licores", nameEs: "Bacardí Mango", nameEn: "Bacardí Mango", descEs: "Ron", descEn: "Rum", priceCents: 11000, station: "barra" },
  { id: 1139, category: "licores", nameEs: "Havana 7", nameEn: "Havana 7", descEs: "Ron", descEn: "Rum", priceCents: 12500, station: "barra" },
  { id: 1140, category: "licores", nameEs: "Matusalem Platino", nameEn: "Matusalem Platino", descEs: "Ron", descEn: "Rum", priceCents: 11000, station: "barra" },
  { id: 1141, category: "licores", nameEs: "Matusalem Clásico", nameEn: "Matusalem Clásico", descEs: "Ron", descEn: "Rum", priceCents: 12000, station: "barra" },
  { id: 1142, category: "licores", nameEs: "Appleton Blanco", nameEn: "Appleton Blanco", descEs: "Ron", descEn: "Rum", priceCents: 11000, station: "barra" },
  { id: 1143, category: "licores", nameEs: "Appleton Oro", nameEn: "Appleton Oro", descEs: "Ron", descEn: "Rum", priceCents: 11000, station: "barra" },
  { id: 1144, category: "licores", nameEs: "Flor de Caña 7", nameEn: "Flor de Caña 7", descEs: "Ron", descEn: "Rum", priceCents: 12000, station: "barra" },
  { id: 1145, category: "licores", nameEs: "Malibú", nameEn: "Malibu", descEs: "Ron", descEn: "Rum", priceCents: 12000, station: "barra" },
  // BRANDY
  { id: 1146, category: "licores", nameEs: "Torres 5", nameEn: "Torres 5", descEs: "Brandy", descEn: "Brandy", priceCents: 11000, station: "barra" },
  { id: 1147, category: "licores", nameEs: "Torres 10", nameEn: "Torres 10", descEs: "Brandy", descEn: "Brandy", priceCents: 12000, station: "barra" },
  { id: 1148, category: "licores", nameEs: "Torres 15", nameEn: "Torres 15", descEs: "Brandy", descEn: "Brandy", priceCents: 16000, station: "barra" },
  { id: 1149, category: "licores", nameEs: "Fundador", nameEn: "Fundador", descEs: "Brandy", descEn: "Brandy", priceCents: 11000, station: "barra" },
  { id: 1150, category: "licores", nameEs: "Azteca de Oro", nameEn: "Azteca de Oro", descEs: "Brandy", descEn: "Brandy", priceCents: 11000, station: "barra" },
  { id: 1151, category: "licores", nameEs: "Terry", nameEn: "Terry", descEs: "Brandy", descEn: "Brandy", priceCents: 11000, station: "barra" },
  // ANÍS
  { id: 1152, category: "licores", nameEs: "Cadenas", nameEn: "Cadenas", descEs: "Anís", descEn: "Anise", priceCents: 11000, station: "barra" },
  { id: 1153, category: "licores", nameEs: "Chinchón dulce o seco", nameEn: "Chinchón sweet or dry", descEs: "Anís", descEn: "Anise", priceCents: 10000, station: "barra" },
  { id: 1154, category: "licores", nameEs: "Sambuca Nero", nameEn: "Sambuca Nero", descEs: "Anís", descEn: "Anise", priceCents: 12000, station: "barra" },
  // MEZCAL
  { id: 1155, category: "licores", nameEs: "Montelobos", nameEn: "Montelobos", descEs: "Mezcal", descEn: "Mezcal", priceCents: 17000, station: "barra" },
  { id: 1156, category: "licores", nameEs: "400 Conejos", nameEn: "400 Conejos", descEs: "Mezcal", descEn: "Mezcal", priceCents: 14500, station: "barra" },
  { id: 1157, category: "licores", nameEs: "Amarás", nameEn: "Amarás", descEs: "Mezcal", descEn: "Mezcal", priceCents: 15000, station: "barra" },
  { id: 1158, category: "licores", nameEs: "Bruxo", nameEn: "Bruxo", descEs: "Mezcal", descEn: "Mezcal", priceCents: 14000, station: "barra" },
  { id: 1159, category: "licores", nameEs: "Bruxo 1", nameEn: "Bruxo 1", descEs: "Mezcal", descEn: "Mezcal", priceCents: 15000, station: "barra" },
  { id: 1160, category: "licores", nameEs: "Bruxo 2", nameEn: "Bruxo 2", descEs: "Mezcal", descEn: "Mezcal", priceCents: 16500, station: "barra" },
  // TEQUILA
  { id: 1161, category: "licores", nameEs: "Jimador", nameEn: "Jimador", descEs: "Tequila", descEn: "Tequila", priceCents: 10000, station: "barra" },
  { id: 1162, category: "licores", nameEs: "José Cuervo Especial", nameEn: "José Cuervo Especial", descEs: "Tequila", descEn: "Tequila", priceCents: 11500, station: "barra" },
  { id: 1163, category: "licores", nameEs: "Tradicional", nameEn: "Tradicional", descEs: "Tequila", descEn: "Tequila", priceCents: 12000, station: "barra" },
  { id: 1164, category: "licores", nameEs: "1800 Blanco", nameEn: "1800 Blanco", descEs: "Tequila", descEn: "Tequila", priceCents: 12000, station: "barra" },
  { id: 1165, category: "licores", nameEs: "1800 Reposado", nameEn: "1800 Reposado", descEs: "Tequila", descEn: "Tequila", priceCents: 14000, station: "barra" },
  { id: 1166, category: "licores", nameEs: "1800 Añejo", nameEn: "1800 Añejo", descEs: "Tequila", descEn: "Tequila", priceCents: 15000, station: "barra" },
  { id: 1167, category: "licores", nameEs: "Maestro Dobel Blanco", nameEn: "Maestro Dobel Blanco", descEs: "Tequila", descEn: "Tequila", priceCents: 11000, station: "barra" },
  { id: 1168, category: "licores", nameEs: "Maestro Dobel Reposado", nameEn: "Maestro Dobel Reposado", descEs: "Tequila", descEn: "Tequila", priceCents: 16000, station: "barra" },
  { id: 1169, category: "licores", nameEs: "Maestro Dobel Añejo", nameEn: "Maestro Dobel Añejo", descEs: "Tequila", descEn: "Tequila", priceCents: 19000, station: "barra" },
  { id: 1170, category: "licores", nameEs: "Maestro Dobel Diamante", nameEn: "Maestro Dobel Diamante", descEs: "Tequila", descEn: "Tequila", priceCents: 19000, station: "barra" },
  { id: 1171, category: "licores", nameEs: "Don Julio Blanco", nameEn: "Don Julio Blanco", descEs: "Tequila", descEn: "Tequila", priceCents: 14000, station: "barra" },
  { id: 1172, category: "licores", nameEs: "Don Julio Reposado", nameEn: "Don Julio Reposado", descEs: "Tequila", descEn: "Tequila", priceCents: 16000, station: "barra" },
  { id: 1173, category: "licores", nameEs: "Don Julio Añejo", nameEn: "Don Julio Añejo", descEs: "Tequila", descEn: "Tequila", priceCents: 20000, station: "barra" },
  { id: 1174, category: "licores", nameEs: "Don Julio 70", nameEn: "Don Julio 70", descEs: "Tequila", descEn: "Tequila", priceCents: 19000, station: "barra" },
  { id: 1175, category: "licores", nameEs: "Herradura Blanco", nameEn: "Herradura Blanco", descEs: "Tequila", descEn: "Tequila", priceCents: 13000, station: "barra" },
  { id: 1176, category: "licores", nameEs: "Herradura Reposado", nameEn: "Herradura Reposado", descEs: "Tequila", descEn: "Tequila", priceCents: 14000, station: "barra" },
  { id: 1177, category: "licores", nameEs: "Herradura Plata", nameEn: "Herradura Plata", descEs: "Tequila", descEn: "Tequila", priceCents: 15000, station: "barra" },
  { id: 1178, category: "licores", nameEs: "7 Leguas Reposado", nameEn: "7 Leguas Reposado", descEs: "Tequila", descEn: "Tequila", priceCents: 19000, station: "barra" },
  // GINEBRA
  { id: 1179, category: "licores", nameEs: "Beefeater", nameEn: "Beefeater", descEs: "Ginebra", descEn: "Gin", priceCents: 13000, station: "barra" },
  { id: 1180, category: "licores", nameEs: "Tanqueray", nameEn: "Tanqueray", descEs: "Ginebra", descEn: "Gin", priceCents: 14000, station: "barra" },
  // VODKA
  { id: 1181, category: "licores", nameEs: "Absolut Azul", nameEn: "Absolut Blue", descEs: "Vodka", descEn: "Vodka", priceCents: 11000, station: "barra" },
  { id: 1182, category: "licores", nameEs: "Smirnoff", nameEn: "Smirnoff", descEs: "Vodka", descEn: "Vodka", priceCents: 9500, station: "barra" },
  { id: 1183, category: "licores", nameEs: "Smirnoff Tamarindo", nameEn: "Smirnoff Tamarind", descEs: "Vodka", descEn: "Vodka", priceCents: 9500, station: "barra" },
  { id: 1184, category: "licores", nameEs: "Absolut Sabores", nameEn: "Absolut Flavors", descEs: "Vodka", descEn: "Vodka", priceCents: 11000, station: "barra" },
  { id: 1185, category: "licores", nameEs: "Stolichnaya", nameEn: "Stolichnaya", descEs: "Vodka", descEn: "Vodka", priceCents: 12000, station: "barra" },
  // WHISKY
  { id: 1186, category: "licores", nameEs: "Buchanan's 12", nameEn: "Buchanan's 12", descEs: "Whisky", descEn: "Whisky", priceCents: 18000, station: "barra" },
  { id: 1187, category: "licores", nameEs: "Etiqueta Roja", nameEn: "Red Label", descEs: "Whisky", descEn: "Whisky", priceCents: 15000, station: "barra" },
  { id: 1188, category: "licores", nameEs: "Etiqueta Negra", nameEn: "Black Label", descEs: "Whisky", descEn: "Whisky", priceCents: 19000, station: "barra" },
  { id: 1189, category: "licores", nameEs: "Jack Daniel's", nameEn: "Jack Daniel's", descEs: "Whisky", descEn: "Whisky", priceCents: 16000, station: "barra" },
  { id: 1190, category: "licores", nameEs: "JB", nameEn: "JB", descEs: "Whisky", descEn: "Whisky", priceCents: 14000, station: "barra" },
  { id: 1191, category: "licores", nameEs: "Jim Beam", nameEn: "Jim Beam", descEs: "Whisky bourbon", descEn: "Bourbon whisky", priceCents: 14000, station: "barra" },
  // LICORES
  { id: 1192, category: "licores", nameEs: "Baileys", nameEn: "Baileys", descEs: "Licor", descEn: "Liqueur", priceCents: 14000, station: "barra" },
  { id: 1193, category: "licores", nameEs: "Licor 43", nameEn: "Licor 43", descEs: "Licor", descEn: "Liqueur", priceCents: 14000, station: "barra" },
  { id: 1194, category: "licores", nameEs: "Kahlúa", nameEn: "Kahlúa", descEs: "Licor", descEn: "Liqueur", priceCents: 12000, station: "barra" },
  { id: 1195, category: "licores", nameEs: "Midori", nameEn: "Midori", descEs: "Licor", descEn: "Liqueur", priceCents: 12500, station: "barra" },
  { id: 1196, category: "licores", nameEs: "Amaretto Disaronno", nameEn: "Amaretto Disaronno", descEs: "Licor", descEn: "Liqueur", priceCents: 13000, station: "barra" },
  { id: 1197, category: "licores", nameEs: "Rompope", nameEn: "Rompope", descEs: "Licor", descEn: "Liqueur", priceCents: 6000, station: "barra" },
  { id: 1198, category: "licores", nameEs: "Amaretto Conti", nameEn: "Amaretto Conti", descEs: "Licor", descEn: "Liqueur", priceCents: 7000, station: "barra" },
  { id: 1199, category: "licores", nameEs: "Frangelico", nameEn: "Frangelico", descEs: "Licor", descEn: "Liqueur", priceCents: 14000, station: "barra" },

  // ---------- COCTELERÍA ----------
  { id: 1201, category: "cocteles", nameEs: "Mojito", nameEn: "Mojito", descEs: "Hierbabuena, ron y un toque de jugo de limón", descEn: "Mint, rum and a touch of lime juice", priceCents: 13000, station: "barra" },
  { id: 1202, category: "cocteles", nameEs: "Bull", nameEn: "Bull", descEs: "Jarabe, jugo de limón, agua mineral, ron y cerveza oscura", descEn: "Syrup, lime juice, sparkling water, rum and dark beer", priceCents: 15000, station: "barra" },
  { id: 1203, category: "cocteles", nameEs: "Tom Collins", nameEn: "Tom Collins", descEs: "Ginebra, jarabe, jugo de limón y agua mineral", descEn: "Gin, syrup, lime juice and sparkling water", priceCents: 13000, station: "barra" },
  { id: 1204, category: "cocteles", nameEs: "Medusa", nameEn: "Medusa", descEs: "Curaçao azul, vodka y anís", descEn: "Blue curaçao, vodka and anise", priceCents: 11000, station: "barra" },
  { id: 1205, category: "cocteles", nameEs: "Vampiro", nameEn: "Vampiro", descEs: "Tequila, sangría y refresco de toronja", descEn: "Tequila, sangria and grapefruit soda", priceCents: 16000, station: "barra" },
  { id: 1206, category: "cocteles", nameEs: "Alfonso XIII", nameEn: "Alfonso XIII", descEs: "Kahlúa y leche", descEn: "Kahlúa and milk", priceCents: 13000, station: "barra" },
  { id: 1207, category: "cocteles", nameEs: "Bloody Mary", nameEn: "Bloody Mary", descEs: "Vodka, salsas, jugo de limón, sal y jugo de tomate", descEn: "Vodka, sauces, lime juice, salt and tomato juice", priceCents: 14000, station: "barra" },
  { id: 1208, category: "cocteles", nameEs: "Ruso Blanco", nameEn: "White Russian", descEs: "Vodka, Kahlúa, licor de cacao y leche", descEn: "Vodka, Kahlúa, cocoa liqueur and milk", priceCents: 13000, station: "barra" },
  { id: 1209, category: "cocteles", nameEs: "Limonada Eléctrica", nameEn: "Electric Lemonade", descEs: "Vodka, ron blanco, tequila blanco, ginebra, jugo de limón, agua mineral y curaçao azul", descEn: "Vodka, white rum, white tequila, gin, lime juice, sparkling water and blue curaçao", priceCents: 14000, station: "barra" },
  { id: 1210, category: "cocteles", nameEs: "Paloma", nameEn: "Paloma", descEs: "Tequila, jugo de limón y refresco de toronja", descEn: "Tequila, lime juice and grapefruit soda", priceCents: 14000, station: "barra" },
  { id: 1211, category: "cocteles", nameEs: "St. Germain", nameEn: "St. Germain", descEs: "Licor St. Germain y vino espumoso", descEn: "St. Germain liqueur and sparkling wine", priceCents: 15000, station: "barra" },
  { id: 1212, category: "cocteles", nameEs: "Aperol Spritz", nameEn: "Aperol Spritz", descEs: "Licor Aperol y vino espumoso", descEn: "Aperol liqueur and sparkling wine", priceCents: 14000, station: "barra" },
  { id: 1213, category: "cocteles", nameEs: "Mimosa", nameEn: "Mimosa", descEs: "Jugo de naranja y vino espumoso", descEn: "Orange juice and sparkling wine", priceCents: 12000, station: "barra" },
  { id: 1214, category: "cocteles", nameEs: "Mint Julep", nameEn: "Mint Julep", descEs: "Menta, jarabe natural, limón y whisky", descEn: "Mint, natural syrup, lime and whisky", priceCents: 13000, station: "barra" },
  { id: 1215, category: "cocteles", nameEs: "Old Fashioned", nameEn: "Old Fashioned", descEs: "Whisky, jarabe natural y bitter Angostura", descEn: "Whisky, natural syrup and Angostura bitters", priceCents: 12000, station: "barra" },
  { id: 1216, category: "cocteles", nameEs: "Ruso Rosa", nameEn: "Pink Russian", descEs: "Vodka, Kahlúa, licor de cereza y leche", descEn: "Vodka, Kahlúa, cherry liqueur and milk", priceCents: 13000, station: "barra" },
  { id: 1217, category: "cocteles", nameEs: "Cucaracha", nameEn: "Cucaracha", descEs: "Tequila y Kahlúa", descEn: "Tequila and Kahlúa", priceCents: 12000, station: "barra" },
  { id: 1218, category: "cocteles", nameEs: "Daiquirí", nameEn: "Daiquiri", descEs: "Jarabe, jugo de limón o mango o piña o durazno o frutos rojos, y ron · Sabor a elegir", descEn: "Syrup, lime or mango or pineapple or peach or red berries juice, and rum · Choose your flavor", priceCents: 15000, station: "barra" },
  { id: 1219, category: "cocteles", nameEs: "Bramble de Mezcal", nameEn: "Mezcal Bramble", descEs: "Mezcal, jugo de limón, jarabe, zarzamoras y licor de cassis", descEn: "Mezcal, lime juice, syrup, blackberries and cassis liqueur", priceCents: 15000, station: "barra" },
  { id: 1220, category: "cocteles", nameEs: "Clamato con Alcohol", nameEn: "Clamato with Alcohol", descEs: "Jugo de limón, salsas, ron o tequila o vodka (preguntar al cliente) y clamato", descEn: "Lime juice, sauces, rum or tequila or vodka (ask the customer) and Clamato", priceCents: 13000, station: "barra" },
  { id: 1221, category: "cocteles", nameEs: "Tequila Sunrise", nameEn: "Tequila Sunrise", descEs: "Tequila, jugo de naranja y un toque de granada", descEn: "Tequila, orange juice and a touch of grenadine", priceCents: 13000, station: "barra" },
  { id: 1222, category: "cocteles", nameEs: "Ruso Negro", nameEn: "Black Russian", descEs: "Vodka, Kahlúa y licor de cacao", descEn: "Vodka, Kahlúa and cocoa liqueur", priceCents: 12000, station: "barra" },
  { id: 1223, category: "cocteles", nameEs: "Pantera Rosa", nameEn: "Pantera Rosa", descEs: "Ginebra, jugo de piña, granadina y leche", descEn: "Gin, pineapple juice, grenadine and milk", priceCents: 13000, station: "barra" },
  { id: 1224, category: "cocteles", nameEs: "Piña Colada con Alcohol", nameEn: "Piña Colada with Alcohol", descEs: "Crema de coco, leche, jugo de piña y vodka o ron", descEn: "Coconut cream, milk, pineapple juice and vodka or rum", priceCents: 14000, station: "barra" },
  { id: 1225, category: "cocteles", nameEs: "Clericot · Copa", nameEn: "Clericot · Glass", descEs: "Fruta, refresco de manzana, agua mineral, Sprite, granadina y vino tinto", descEn: "Fruit, apple soda, sparkling water, Sprite, grenadine and red wine", priceCents: 10000, station: "barra" },
  { id: 1226, category: "cocteles", nameEs: "Clericot · Jarra", nameEn: "Clericot · Pitcher", descEs: "Fruta, refresco de manzana, agua mineral, Sprite, granadina y vino tinto", descEn: "Fruit, apple soda, sparkling water, Sprite, grenadine and red wine", priceCents: 23000, station: "barra" },
  { id: 1227, category: "cocteles", nameEs: "Piña Colada con Licor 43 o Frangelico", nameEn: "Piña Colada with Licor 43 or Frangelico", descEs: "Crema de coco, leche, jugo de piña y Licor 43", descEn: "Coconut cream, milk, pineapple juice and Licor 43", priceCents: 14000, station: "barra" },
  { id: 1228, category: "cocteles", nameEs: "Piña Colada con Midori, Amaretto o Kahlúa", nameEn: "Piña Colada with Midori, Amaretto or Kahlúa", descEs: "Crema de coco, leche, jugo de piña y Midori", descEn: "Coconut cream, milk, pineapple juice and Midori", priceCents: 14000, station: "barra" },
  { id: 1229, category: "cocteles", nameEs: "Sangría con Alcohol", nameEn: "Sangria with Alcohol", descEs: "Jarabe, jugo de limón, agua mineral, vodka y vino tinto", descEn: "Syrup, lime juice, sparkling water, vodka and red wine", priceCents: 12000, station: "barra" },
  { id: 1230, category: "cocteles", nameEs: "Medias de Seda", nameEn: "Medias de Seda", descEs: "Leche, granadina y ginebra", descEn: "Milk, grenadine and gin", priceCents: 11500, station: "barra" },
  { id: 1231, category: "cocteles", nameEs: "Margarita", nameEn: "Margarita", descEs: "Tequila, jarabe, triple sec, jugo de limón o mango o durazno o piña o frutos rojos o mora azul o mandarina o manzana verde o jamaica o naranja · Sabor a elegir", descEn: "Tequila, syrup, triple sec, lime or mango or peach or pineapple or red berries or blueberry or tangerine or green apple or hibiscus or orange juice · Choose your flavor", priceCents: 15000, station: "barra" },
  { id: 1232, category: "cocteles", nameEs: "Conga con Alcohol", nameEn: "Conga with Alcohol", descEs: "Ron, jugo de naranja, jugo de piña, jugo de toronja y un toque de granadina", descEn: "Rum, orange juice, pineapple juice, grapefruit juice and a touch of grenadine", priceCents: 13500, station: "barra" },
  { id: 1233, category: "cocteles", nameEs: "Martini de Mazapán", nameEn: "Mazapán Martini", descEs: "Mazapán, leche evaporada, Frangelico, vodka y Kahlúa", descEn: "Mazapán, evaporated milk, Frangelico, vodka and Kahlúa", priceCents: 17000, station: "barra" },
  { id: 1234, category: "cocteles", nameEs: "Negroni", nameEn: "Negroni", descEs: "Vermut rojo, ginebra y Campari", descEn: "Red vermouth, gin and Campari", priceCents: 15000, station: "barra" },
  { id: 1235, category: "cocteles", nameEs: "Guacamaya", nameEn: "Guacamaya", descEs: "Vodka, curaçao azul, jugo de naranja y jugo de piña", descEn: "Vodka, blue curaçao, orange juice and pineapple juice", priceCents: 14000, station: "barra" },
  { id: 1236, category: "cocteles", nameEs: "Cosmopolitan", nameEn: "Cosmopolitan", descEs: "Vodka citrus, triple sec, jugo de limón y jugo de arándano", descEn: "Citrus vodka, triple sec, lime juice and cranberry juice", priceCents: 15000, station: "barra" },
  { id: 1237, category: "cocteles", nameEs: "Carajillo", nameEn: "Carajillo", descEs: "Licor 43 y café espresso", descEn: "Licor 43 and espresso", priceCents: 15000, station: "barra" },
  { id: 1238, category: "cocteles", nameEs: "Splash", nameEn: "Splash", descEs: "Amaretto y jugo de naranja", descEn: "Amaretto and orange juice", priceCents: 12000, station: "barra" },
  { id: 1239, category: "cocteles", nameEs: "Piedra", nameEn: "Piedra", descEs: "Tequila, anís y un toque de Angostura o Fernet", descEn: "Tequila, anise and a touch of Angostura or Fernet", priceCents: 13000, station: "barra" },
  { id: 1240, category: "cocteles", nameEs: "Luces de La Habana", nameEn: "Luces de La Habana", descEs: "Midori, Malibú, jugo de piña y jugo de naranja", descEn: "Midori, Malibu, pineapple juice and orange juice", priceCents: 14000, station: "barra" },
  { id: 1241, category: "cocteles", nameEs: "Sex on the Beach", nameEn: "Sex on the Beach", descEs: "Vodka, licor de durazno, jugo de piña, jugo de naranja y jugo de arándano", descEn: "Vodka, peach liqueur, pineapple juice, orange juice and cranberry juice", priceCents: 15000, station: "barra" },
  // ---------- BEBIDAS SIN ALCOHOL ----------
  { id: 1242, category: "sin-alcohol", nameEs: "Conga sin Alcohol", nameEn: "Conga (non-alcoholic)", descEs: "Jugo de naranja, jugo de piña, jugo de toronja y un toque de granadina", descEn: "Orange juice, pineapple juice, grapefruit juice and a touch of grenadine", priceCents: 8000, station: "barra" },
  { id: 1243, category: "sin-alcohol", nameEs: "Limonada", nameEn: "Lemonade", descEs: "Jugo de limón, jarabe y agua mineral o natural", descEn: "Lime juice, syrup and sparkling or still water", priceCents: 6000, station: "barra" },
  { id: 1244, category: "sin-alcohol", nameEs: "Naranjada", nameEn: "Orangeade", descEs: "Jugo de naranja, jarabe y agua mineral o natural", descEn: "Orange juice, syrup and sparkling or still water", priceCents: 6000, station: "barra" },
  { id: 1245, category: "sin-alcohol", nameEs: "Jugos", nameEn: "Juices", descEs: "Naranja o durazno o mango o arándano o piña · Sabor a elegir", descEn: "Orange or peach or mango or cranberry or pineapple · Choose your flavor", priceCents: 5000, station: "barra" },
  { id: 1246, category: "sin-alcohol", nameEs: "Piñada", nameEn: "Piñada", descEs: "Crema de coco, leche y jugo de piña", descEn: "Coconut cream, milk and pineapple juice", priceCents: 8000, station: "barra" },
  { id: 1247, category: "sin-alcohol", nameEs: "Clamato", nameEn: "Clamato", descEs: "Clamato, jugo de limón y salsas", descEn: "Clamato, lime juice and sauces", priceCents: 7000, station: "barra" },
  { id: 1248, category: "sin-alcohol", nameEs: "Sol en la Playa", nameEn: "Sol en la Playa", descEs: "Jugo de durazno, jugo de piña, jugo de naranja y jugo de arándano", descEn: "Peach juice, pineapple juice, orange juice and cranberry juice", priceCents: 8000, station: "barra" },
];

// Ítems con precio por confirmar (hoy ninguno: Cesar confirmó los 6
// precios pendientes el 2026-11-26). Se conserva el filtro por si en el
// futuro algún precio queda pendiente.
export const COCUYOS_PENDING_PRICE = COCUYOS_MENU.filter((i) => i.priceCents === null);

export function cocuyosItemById(id: number): CocuyosItem | undefined {
  return COCUYOS_MENU.find((i) => i.id === id);
}

export function cocuyosItemsForCategory(category: CocuyosCategoryId): CocuyosItem[] {
  return COCUYOS_MENU.filter((i) => i.category === category || (i.alsoIn ?? []).includes(category));
}

export const RESTAURANTS = [
  {
    slug: "cocuyos",
    name: "Taquería Los Cocuyos",
    address: "CDMX",
    description: "Taquería desde 1990. Bib Gourmand — Guía Michelin. Tacos, gringas, tortas, alambres y coctelería.",
    status: "listo" as const,
  },
];
