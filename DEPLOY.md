# Despliegue a Vercel — pasos exactos

## 1. Prueba local (sin cuentas)

```bash
cd ~/workspace/comanda-vercel
npm install
npm run dev
# http://localhost:3000
#   /                raíz de Comanda
#   /dzib            menú (sin QR solo se ve el menú)
#   /dzib?mesa=1     pedir como Mesa 1
#   /dzib/personal   entrada del personal (crear PINs la primera vez)
#   /tacos-la-chula  estructura, menú por cargar
npm run build
```

Sin `POSTGRES_URL` corre en modo demo (memoria). Los pedidos no persisten.

## 2. GitHub (cuenta de Cesar)

1. Crear repo vacío `comanda` en github.com (privado, recomendado).
2. En la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Comanda v0.1 — raíz + Dzib + estructura La Chula"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/comanda.git
   git push -u origin main
   ```
3. Nunca subir `.env.local` (ya está en `.gitignore`).

## 3. Vercel (cuenta de Cesar, plan Hobby $0)

1. vercel.com → Add New → Project → Import Git Repository → elegir `comanda`.
2. Framework: Next.js (se detecta solo). Root Directory: `./`.
3. Deploy.

## 4. Base de datos (elige una, gratis para empezar)

**Opción A — Vercel Postgres (recomendada):**
Vercel → tu proyecto → Storage → Create Database → Postgres → Create.
Vercel conecta el proyecto y rellena `POSTGRES_URL` solo.

**Opción B — Neon (gratis):** neon.tech → crear proyecto → copiar la
connection string → pegarla como `POSTGRES_URL` en Vercel → Settings →
Environment Variables.

**Opción C — Supabase (gratis):** supabase.com → crear proyecto → Settings →
Database → Connection string → igual que B.

Después, aplica el esquema en esa base:
```bash
psql "$POSTGRES_URL" -f scripts/seed.sql
# o pega el contenido de scripts/seed.sql en el editor SQL del proveedor.
```

## 5. Variables de entorno en Vercel

En Settings → Environment Variables:
- `STAFF_SESSION_SECRET` = una frase larga aleatoria (obligatoria en producción).
- `POSTGRES_URL` = la da Vercel Postgres, o la de Neon/Supabase.
- `NEXT_PUBLIC_CONTACT_EMAIL` = cesarperezcano90@gmail.com (ya por defecto).
- `NEXT_PUBLIC_CONTACT_WHATSAPP` = 5215522495899 (ya por defecto).

Redeploy después de cambiar variables.

## 6. Primer uso en producción

1. Abrir `https://TU-PROYECTO.vercel.app/dzib/personal`.
2. Crear las claves por rol (Caja primero, 4–8 dígitos, distintas entre sí).
3. Entrar como Caja → revisar desayunos, menú del día, mesas y ajustes.
4. Publicar el menú de comida real de hoy (no el ejemplo del 1 de noviembre).
5. Confirmar con el dueño: precios de comida ($45/$67) y agua ($15/$40/$80).

## 7. Dominio (cuando Cesar elija)

1. Comprar el dominio en Cloudflare / Namecheap / Akky (a su nombre).
2. Vercel → proyecto → Settings → Domains → Add → escribir el dominio →
   seguir las instrucciones de DNS que da Vercel.
3. Esperar a que el certificado SSL se active (lo da Vercel gratis).
4. Regenerar los QR de las mesas con `https://TU-DOMINIO/dzib?mesa=N`
   (N = 1..12) e imprimirlos.
5. Cambiar el correo de contacto a uno profesional (p. ej. hola@comanda.mx)
   en `NEXT_PUBLIC_CONTACT_EMAIL` cuando esté listo.

## 8. Pendientes conocidos (no ocultar)

- Menú de La Chula: transcribir los 74 platillos a `src/data/la-chula.ts`.
- Refresco en vivo cocina/meseros: hoy es por consulta a la API; añadir
  polling cada 5 s o SSE.
- Borrador diario 07:00: usar Vercel Cron (`vercel.json` → crons) que llame
  a un endpoint que prepare el menú del día, o crearlo a mano.
- Generación de QR: añadir `qrcode` y una página `/dzib/qr` en Admin que
  imprima las 12 tarjetas con la URL final.
