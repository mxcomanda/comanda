// Página raíz de Comanda — muy sencilla, blanca, vintage (Mr Blancos / Chubbies).
// Solo: marca, leyenda breve y botones de contacto. Sin catálogo.
// Contactos puestos por Cesar (2026-11-21): cesarperezcano90@gmail.com y WhatsApp 55 2249 5899.
import Image from "next/image";
export default function Home() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "cesarperezcano90@gmail.com";
  const wa = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "5215522495899";
  return (
    <main className="wrap">
      <section className="hero">
        <Image className="mesero" src="/mesero.svg" alt="Mesero vintage de Comanda con charola" width={320} height={420} priority />
        <div>
          <h1 className="brand">COMANDA</h1>
          <p className="hand">¡A sus órdenes!</p>
          <p className="lede">
            ¿Te gustaría optimizar tu servicio y que tu menú tenga diseños increíbles?
            Escríbenos y lo hacemos realidad para tu restaurante.
          </p>
          <div className="btns">
            <a className="btn btn-red" href={`mailto:${email}`}>Correo electrónico</a>
            <a className="btn btn-yellow" href={`https://wa.me/${wa}?text=${encodeURIComponent("Hola, me interesa optimizar el servicio de mi restaurante con Comanda.")}`}>WhatsApp</a>
          </div>
          <p className="note">Restaurantes en Comanda: <a href="/dzib">Dzib</a> · <a href="/tacos-la-chula">Tacos La Chula</a></p>
        </div>
      </section>
    </main>
  );
}
