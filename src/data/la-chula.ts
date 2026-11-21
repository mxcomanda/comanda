// Tacos La Chula — ESTRUCTURA lista, menú PENDIENTE de cargar con datos verificados.
// Por qué no está el menú completo aquí (honesto): la app de La Chula en Muse
// (tacos-la-chula-app-para-pedir) es client-only, sin acciones de servidor, así
// que no se puede extraer su carta de 74 platillos con una llamada como en Dzib.
// Lo que sí está verificado en memoria: 74 platillos en 11 categorías, carta
// oficial de Juárez verificada en oct 2026, 8 sucursales, pago con terminal o
// efectivo con cambio exacto, estaciones (trompo/tacos, parrilla, comal, cocina,
// barra/bebidas), aviso a meseros cuando el pedido está listo, mapa de mesas y
// QR distinto por mesa, ilustraciones rótulos (sin fotos).
// Para completar /tacos-la-chula hay que transcribir su carta desde la app de
// Muse o desde tacoslachula.com.mx y volcarla aquí con el mismo formato que
// src/data/dzib.ts. No se inventó ningún platillo ni precio.
export const LA_CHULA_META = {
  slug: "tacos-la-chula",
  name: "Tacos La Chula",
  since: 2021,
  hours: "24 horas",
  branches: ["Roma", "Revolución", "Del Valle", "Juárez", "Universidad", "Satélite", "Arboledas", "Los Ángeles (próximamente)"],
  stations: ["Trompo / Tacos", "Parrilla", "Comal", "Cocina", "Barra / Bebidas"],
  payment: "Terminal al final, o efectivo con el monto exacto y cambio exacto.",
  status: "por-cargar",
};
// TODO: cargar aquí los 74 platillos (nombre, descripción, precio, categoría, estación)
// con el formato de DZIB_BREAKFAST antes de publicar /tacos-la-chula como pedidos.
export const LA_CHULA_MENU: never[] = [];
