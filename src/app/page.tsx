// Página raíz de Comanda — diseño original aprobado por Cesar en Muse.
// Blanca, vintage (Mr Blancos / Chubbies), mesero original en tinta negra
// (mesero.webp, ojo izquierdo corregido). Solo marca, leyenda y contacto.
// Contactos puestos por Cesar (2026-11-21): cesarperezcano90@gmail.com y WhatsApp 55 2249 5899.
import Image from "next/image";
export default function Home() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "cesarperezcano90@gmail.com";
  const wa = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "5215522495899";
  return (
    <>
      <div className="top-band" aria-hidden="true">Menús digitales <span className="star">★</span> Pedidos por QR <span className="star">★</span> Para restaurantes</div>
      <main className="root-main">
        <Image className="mascot" src="/mesero.webp" alt="Mesero vintage de Comanda: personaje de caricatura de los años treinta en tinta negra, con moño y saco blanco, sosteniendo en alto una charola con campana y saludando con la otra mano" width={1120} height={2240} priority />
        <div className="copy">
          <div className="kicker"><span className="star">★</span> Menús digitales <span className="star">★</span></div>
          <h1>Comanda</h1>
          <div className="script">¡A sus órdenes!</div>
          <p className="legend">¿Te gustaría <strong>optimizar tu servicio</strong> y que tu menú tenga <span className="hl"><strong>diseños increíbles</strong></span>? Escríbenos y lo hacemos realidad para tu restaurante.</p>
          <div className="buttons">
            <a className="btn btn-mail" href={`mailto:${email}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              Correo electrónico
            </a>
            <a className="btn btn-wa" href={`https://wa.me/${wa}?text=${encodeURIComponent("Hola, me interesa optimizar el servicio de mi restaurante con Comanda.")}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2m0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.38-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28" /></svg>
              WhatsApp
            </a>
          </div>
          <p className="note">Restaurantes en Comanda: <a href="/dzib">Dzib</a> · <a href="/tacos-la-chula">Tacos La Chula</a></p>
        </div>
      </main>
      <div className="checker" aria-hidden="true" />
    </>
  );
}
