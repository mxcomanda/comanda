# Comanda — proyecto para Vercel (sin dominio todavía)

Plataforma general de menús para restaurantes. Raíz en `/`, cada restaurante
en su propia ruta: `/dzib` y `/tacos-la-chula`.

## Qué quedó listo para desplegar

- **Página raíz `/`** — blanca, vintage (Mr Blancos / Chubbies Burger), mesero
  ilustrado en SVG original (`public/mesero.svg`, ojos simétricos corregidos),
  leyenda breve y botones a `cesarperezcano90@gmail.com` y WhatsApp
  `55 2249 5899` (`wa.me/5215522495899`).
- **`/dzib` completo (flujo replicado de la app de Muse):**
  - Desayunos: 48 platillos exactos de la app de Muse (22 sencillos $82,
    8 especiales $92, 13 otras opciones $120–$140, 5 extras), guisado de hoy
    **pollo a la pibil $78** como primer grupo de Desayunos.
  - Menú de comida: ejemplo del 1 de noviembre, marcado como **ejemplo**,
    sencillo $45 / especial $67 **sin confirmar**.
  - Agua del día: **precio por confirmar** ($15 / $40 / $80 son valores
    iniciales sin confirmar).
  - Acceso por QR de mesa (`?mesa=N`, 12 mesas, 2 zonas). Sin QR válido solo
    se ve el menú.
  - Tiempos en secuencia: cada tiempo queda en espera y no aparece en cocina
    hasta pedirlo en orden (1º → 2º → 3º). API: `POST /api/dzib/course`.
  - Pedidos y cuentas por mesa, cobro al final (terminal o efectivo con
    cambio exacto) — API: `POST /api/dzib/order`.
  - Roles con PIN propio (4–8 dígitos, distintos, sin PIN por defecto):
    Cocina solo Cocina, Meseros solo Meseros, Caja todo. Control **en el
    servidor** en cada API route (`src/lib/auth.ts`).
- **`/tacos-la-chula`** — estructura lista, menú **por cargar** (ver abajo).
- **Base de datos:** esquema Postgres en `scripts/seed.sql` (restaurantes,
  menú, mesas, cuentas, pedidos, PINs hasheados, ajustes).
- **Configuración Vercel:** `vercel.json`, `.env.example`.

## Opción elegida (más simple y barata para empezar)

**Next.js 14 (App Router) en Vercel + Vercel Postgres.**
- Vercel Hobby: **$0/mes** para empezar (dominio .vercel.app gratis).
- Vercel Postgres: plan Hobby con almacenamiento incluido para empezar;
  alternativa gratuita equivalente: **Neon** o **Supabase** (misma
  `POSTGRES_URL`, sin cambiar código).
- Sin `POSTGRES_URL` la app corre en **modo demo** con datos en memoria:
  sirve para probar el flujo, pero los pedidos **no persisten** entre
  reinicios/instancias (Vercel serverless no comparte memoria). Es un aviso
  visible en la app, no un error silencioso.

## Qué NO se pudo replicar tal cual desde Muse (honesto)

1. **El código de los artefactos de Muse no se puede exportar.** Los artefactos
   viven en el runtime de Muse; no hay botón de exportar el fullstack ni su
   base de datos. Este proyecto es una **reconstrucción** con los mismos datos
   (sacados con `getState` de la app de Dzib) y el mismo flujo, no una copia
   byte a byte. El diseño de la raíz se recreó en SVG/CSS, no con la imagen
   `mesero.webp` generada en Muse (esa vive dentro del artefacto).
2. **Menú de Tacos La Chula (74 platillos):** su app en Muse es client-only,
   sin acciones de servidor, así que no se pudo extraer la carta por API.
   Hay que transcribirla desde la app de Muse o tacoslachula.com.mx y volcarla
   en `src/data/la-chula.ts` con el formato de `src/data/dzib.ts`. No se
   inventó ningún platillo ni precio.
3. **Actualización en tiempo real entre cocina/meseros:** en Muse era en vivo
   dentro del artefacto. Aquí las vistas de personal consultan la API; el
   refresco en vivo (polling/SSE) es el siguiente paso, no está en esta
   primera versión.
4. **Borrador automático del menú del día cada mañana (07:00):** en Muse era
   un cron del artefacto. En Vercel se hace con **Vercel Cron** (ver
   DEPLOY.md) o se crea el borrador a mano en Admin.
5. **QR por mesa:** la generación de QR no está incluida en esta versión
   (se genera con la URL final una vez se tenga dominio; en Vercel el QR
   apunta a `https://TU-DOMINIO/dzib?mesa=N`).

## Qué falta (cuentas y decisiones del usuario)

1. **Cuenta de Vercel** (gratis) + **cuenta de GitHub** (gratis) a nombre de
   Cesar / del restaurante. No se subió nada a Vercel ni a GitHub: no tengo
   sus credenciales y no se piden por chat.
2. **Base de datos:** crear Vercel Postgres en el panel de Vercel (o Neon /
   Supabase gratis) y aplicar `scripts/seed.sql`.
3. **Dominio:** Cesar aún no se decide. Cuando lo elija: comprarlo en un
   registrador (Cloudflare / Namecheap / Akky) y añadirlo en Vercel →
   Settings → Domains. `comanda.app` ya está registrado y aparcado en
   GoDaddy; `comanda.mx` no cargó en la comprobación y su disponibilidad
   sigue sin confirmarse en un registrador.
4. **Menú de hoy de Dzib:** sigue faltando el menú de comida real de hoy
   (el ejemplo del 1 de noviembre no es el de hoy) y la confirmación de
   precios de comida y agua por el dueño.
5. **PINs del personal:** se crean en la primera entrada en `/dzib/personal`
   (sin valores por defecto).

## Pasos exactos que faltan (ver DEPLOY.md para el detalle)

```bash
# 1. En tu computadora, con Node 18+:
npm install
npm run dev        # probar en http://localhost:3000
npm run build      # debe compilar sin errores

# 2. Subir a GitHub (cuenta de Cesar):
git init && git add . && git commit -m "Comanda v0.1"
git remote add origin https://github.com/TU-USUARIO/comanda.git
git push -u origin main

# 3. En vercel.com → Add New → Project → Importar el repo de GitHub.
# 4. Storage → Create Database → Postgres → conectar al proyecto.
# 5. Aplicar scripts/seed.sql en esa base de datos.
# 6. Environment Variables: STAFF_SESSION_SECRET (frase larga aleatoria).
# 7. Deploy. Probar: / , /dzib?mesa=1 , /dzib/personal.
# 8. Cuando haya dominio: Settings → Domains → añadirlo y regenerar los QR.
```
