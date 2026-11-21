// /tacos-la-chula — estructura lista, menú por cargar (ver src/data/la-chula.ts).
import { LA_CHULA_META } from "@/data/la-chula";
export default function LaChulaPage() {
  return (
    <main className="wrap">
      <h2>Tacos La Chula</h2>
      <p className="muted">Taquería 24 horas, desde 2021. Tortillas hechas a mano.</p>
      <p>Sucursales: {LA_CHULA_META.branches.join(" · ")}</p>
      <p className="danger">
        El menú completo de 74 platillos en 11 categorías está en la app de Muse
        (client-only, sin exportación de servidor) y aún no se ha transcrito a este
        proyecto. No se publica ningún platillo ni precio inventado. Ver README.md,
        sección “Qué falta”.
      </p>
      <p>Estaciones: {LA_CHULA_META.stations.join(" · ")}. Pago: {LA_CHULA_META.payment}</p>
    </main>
  );
}
