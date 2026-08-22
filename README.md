# MyBudget

Control de finanzas personales. React + Vite + Tailwind + Framer Motion + Recharts + Supabase.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Completa `.env` con tu `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
(Supabase → Project Settings → API Keys).

## 3. Base de datos

Corre el script `fase1_database_schema.sql` que ya tienes en el SQL Editor
de tu proyecto de Supabase (tablas, RLS, triggers, auto-provisioning).

## 4. Correr en desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

## 5. Deploy a GitHub Pages

1. Edita `vite.config.js` y confirma que `base` coincide con el nombre real de tu repositorio de GitHub.
2. En GitHub: Settings → Pages → Source → "GitHub Actions".
3. En GitHub: Settings → Secrets and variables → Actions, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Haz push a `main`. El workflow en `.github/workflows/deploy.yml` construye
   y publica automáticamente.

## Estructura

```
src/
├── components/   # UI, layout, charts, dashboard
├── contexts/     # Auth, Theme, Period (mes activo)
├── pages/        # Dashboard, Income, Expenses, Savings, Accounts,
│                 # History, Analytics, Settings, auth/*
├── services/     # Toda la comunicación con Supabase, por entidad
└── utils/        # Formato, cálculos financieros
```

## Notas de alcance

- Exportar historial completo (CSV) y reporte anual (PDF) están en Ajustes.
- El login con Google ya está wireado (`signInWithGoogle` en
  `AuthContext.jsx`); solo necesita que actives el provider en Supabase.
- El "Clonar mes" copia presupuestos y distribución de cuentas; las
  categorías, cuentas y metas ya son reutilizables por diseño y no
  necesitan copiarse.
