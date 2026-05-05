<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Project manifest — maniagro-ip

Plataforma interna de gestión de proyectos para el equipo de Ingeniería de Procesos de Maniagro.

## Tech stack

| Herramienta | Versión |
|---|---|
| Next.js (App Router) | 16.2.4 |
| React | 19.2.4 |
| TypeScript | 5.x |
| Prisma | 7.8.0 |
| @prisma/adapter-pg | 7.8.0 |
| NextAuth (Auth.js) | 5.0.0-beta.31 |
| googleapis | 171.4.0 |
| Tailwind CSS | 4.x |
| recharts | 3.8.1 |
| Database | Neon PostgreSQL (serverless, via PrismaPg adapter) |

## Arquitectura de carpetas

```
src/
├── app/                          — Next.js App Router
│   ├── (auth)/login/             — Página de login
│   ├── (dashboard)/              — Layout autenticado (Sidebar + Topbar)
│   │   ├── page.tsx              — Dashboard principal
│   │   ├── solicitudes/          — Listado y detalle de solicitudes
│   │   ├── actividades/          — Actividades personales de Francisco
│   │   ├── criterios/            — Tabla de criterios CLASIF
│   │   └── usuarios/             — Gestión de usuarios
│   ├── api/
│   │   ├── auth/[...nextauth]/   — NextAuth handler
│   │   ├── import-missing/       — Sheet rows sin _ID → crea registros en DB
│   │   ├── sync-from-sheet/      — Sheet → DB (actualiza registros existentes)
│   │   ├── sync-to-sheet/        — DB → Sheet (batchUpdate masivo)
│   │   └── sync-actividades/     — Sheet ACT FRANCISCO → DB Actividad
│   └── layout.tsx                — Root layout
│
├── features/                     — Lógica de negocio por dominio
│   ├── solicitudes/
│   │   ├── domain/
│   │   │   ├── validators.ts     — ESTADO_MAP, PRIORIDAD_MAP, normalize*()
│   │   │   └── mappers.ts        — SOLICITUD_HEADERS, solicitudToSheetRow()
│   │   └── api/
│   │       └── handlers.ts       — syncFromSheetHandler, importMissingHandler, syncToSheetHandler
│   └── actividades/
│       └── api/
│           └── handlers.ts       — syncActividadesHandler
│
├── shared/
│   └── ui/sync/
│       └── SyncButtons.tsx       — SyncFromSheetButton + SyncToSheetButton (client components)
│
├── components/                   — Componentes de UI reutilizables
│   ├── Sidebar.tsx               — Navegación lateral (dark, bg-slate-900)
│   ├── Topbar.tsx                — Header con SyncButtons + avatar + signOut
│   ├── DashboardCharts.tsx       — Gráficos recharts (client)
│   ├── DashboardFiltroResponsable.tsx
│   ├── FiltrosSolicitudes.tsx
│   ├── NuevaSolicitudModal.tsx
│   ├── SolicitudKanban.tsx
│   ├── SolicitudTable.tsx
│   └── SyncSheetButton.tsx       — LEGACY: mantener, ya no usado en Topbar
│
├── lib/                          — Infraestructura compartida (NO mover ni eliminar)
│   ├── prisma.ts                 — PrismaClient singleton con PrismaPg adapter
│   ├── sheets.ts                 — Google Sheets: leer/escribir/borrar solicitudes y actividades
│   ├── auth.ts                   — NextAuth con PrismaAdapter (Node runtime)
│   ├── auth.config.ts            — NextAuth config (Edge-safe, sin PrismaAdapter)
│   └── email.ts                  — Resend email client
│
├── generated/prisma/             — Output de Prisma (auto-generado, NO editar)
│   └── client.ts                 — Importar desde aquí: @/generated/prisma/client
│
└── middleware.ts                 — DEBE estar en raíz de src/ o raíz del proyecto
```

## Base de datos (Prisma)

### Enums
```
Estado:        NO_INICIADO | EN_PROCESO | EN_REVISION | FINALIZADO | RETRASADO | ANULADO
Prioridad:     BAJA | MEDIA | ALTA
Tipo:          ST | SNP
Clasificacion: A | B | C
Role:          REFERENTE | COLABORADOR
```

### Modelos principales
- **Solicitud** — registro central: proyecto, estado, prioridad, asignado, fechas, avance, etc.
- **Actividad** — tarea personal vinculada opcionalmente a una Solicitud; sincronizada desde la hoja "ACT FRANCISCO"
- **CriterioClasificacion** — tabla de criterios por tipo/clasificacion (leída desde hoja CLASIF)
- **User / Account / Session / VerificationToken** — NextAuth

### Reglas de importación
```typescript
// ✅ Correcto
import { prisma } from "@/lib/prisma";
import type { Solicitud } from "@/generated/prisma/client";

// ❌ Incorrecto
import { PrismaClient } from "@prisma/client";
```

## Google Sheets

- **Hoja principal**: `Lista Maestra` (variable: `GOOGLE_SHEET_NAME`)
- **Hoja de actividades**: `ACT FRANCISCO`
- **Hoja de criterios**: `CLASIF`
- Nombres con espacios deben ir entre comillas simples en notación A1: `'Lista Maestra'!A1:Z5000`
- La columna **Z** (`_ID`) es la columna de referencia interna que enlaza filas del sheet con registros de DB.
- `solicitudToSheetRow()` en `features/solicitudes/domain/mappers.ts` define el orden exacto de columnas (A–Z). No alterar sin actualizar también `readSolicitudesFromSheet()` en `lib/sheets.ts`.
- Para escrituras masivas usar `batchUpdate` (un solo call API). Para filas nuevas usar `values.append` con `INSERT_ROWS`.

### Flujo de sincronización
```
Sheet → DB:
  1. /api/import-missing   → crea registros sin _ID y escribe IDs en columna Z
  2. /api/sync-from-sheet  → actualiza registros existentes (requiere _ID válido en col Z)
  3. /api/sync-actividades → sincroniza hoja ACT FRANCISCO → tabla Actividad

DB → Sheet:
  /api/sync-to-sheet → batchUpdate de todas las solicitudes (update existentes + append nuevas)
```

## Autenticación

- Solo cuentas `@maniagro.com` pueden iniciar sesión (Google OAuth)
- Sesión dura **30 días** (JWT, maxAge + cookie maxAge configurados en `auth.config.ts`)
- Cookie: `__Secure-next-auth.session-token` en producción, `next-auth.session-token` en desarrollo
- **Edge constraint**: `auth.config.ts` es Edge-safe (sin PrismaAdapter). `auth.ts` usa PrismaAdapter y corre en Node.
- El middleware importa solo desde `auth.config.ts`, nunca desde `auth.ts`.

### Patrón de autenticación en API routes
```typescript
// Acepta Vercel Cron (Bearer) O sesión de usuario autenticado
const isCron = request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
const isUser = !!(await auth())?.user;
if (!isCron && !isUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

## Convenciones de UI

- Paleta estructural: **slate** (no gray). Usar `slate-50/100/200/500/700/800/900`.
- Sidebar: `bg-slate-900`, activo: `bg-emerald-500/10 text-emerald-400` con borde izquierdo `bg-emerald-500`.
- Botón primario sync: `bg-emerald-600 text-white hover:bg-emerald-700`.
- Botón secundario sync: `bg-white border-gray-200 text-gray-700 hover:bg-gray-50`.
- Cards de métricas: `bg-white rounded-xl border border-slate-200 p-4`.
- Tablas: `rounded-xl border border-slate-200 shadow-sm bg-white`, header `bg-slate-50`, hover `hover:bg-slate-50/50`.
- `searchParams` en server components es una **Promise** en Next.js 16: `const { x } = await searchParams`.

## Variables de entorno requeridas

```
DATABASE_URL                  — Neon PostgreSQL connection string
GOOGLE_SPREADSHEET_ID         — ID del spreadsheet de Google Sheets
GOOGLE_SHEET_NAME             — Nombre de la hoja principal (default: "Lista Maestra")
GOOGLE_SERVICE_ACCOUNT_EMAIL  — Email de la service account
GOOGLE_PRIVATE_KEY            — Clave privada (con \n escapados)
AUTH_GOOGLE_ID                — OAuth Client ID
AUTH_GOOGLE_SECRET            — OAuth Client Secret
AUTH_SECRET                   — Secret para NextAuth JWT
CRON_SECRET                   — Bearer token para Vercel Cron Jobs
```

## Restricciones importantes

- **No mover** `middleware.ts` — Next.js lo requiere en `src/` o en la raíz del proyecto.
- **No mover ni eliminar** `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/prisma.ts`, `src/lib/sheets.ts` — importados directamente por páginas y features.
- **No editar** `src/generated/prisma/` — generado automáticamente por `prisma generate`.
- Al modificar el schema de Prisma, siempre correr `npx prisma migrate dev` y luego `npx prisma generate`.
