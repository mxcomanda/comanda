import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Comanda — Menús y pedidos para restaurantes",
  description: "¿Te gustaría optimizar tu servicio y que tu menú tenga diseños increíbles? Escríbenos y lo hacemos realidad para tu restaurante.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <div className="topbar">Comanda · Menús digitales y pedidos para restaurantes</div>
        {children}
        <div className="checker" aria-hidden="true" />
      </body>
    </html>
  );
}
