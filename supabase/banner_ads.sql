-- ─────────────────────────────────────────────────────────────────────────────
--  Carrusel de banners publicitarios del Home
--
--  Tabla simple para cargar banners A MANO (por ahora no hay panel de
--  administración): se editan desde el Table Editor de Supabase o con INSERTs
--  en el SQL Editor — ambos corren como service_role y saltean RLS, así que
--  esta tabla NO necesita políticas de escritura.
--
--  El Home lee sólo los banners activos, ordenados por `orden`, y rota entre
--  ellos cada 5 s (ver src/components/BannerCarousel.js). Cada banner es una
--  imagen + un link; al tocarlo abre esa URL en una pestaña nueva.
--
--  Todavía no hay facturación ni sistema de pago — esto es sólo la parte
--  técnica del carrusel.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.banner_ads (
  id          uuid default gen_random_uuid() primary key,
  imagen_url  text    not null,
  link_url    text    not null,
  activo      boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz default now()
);

alter table public.banner_ads enable row level security;

-- Sólo lectura, y sólo de los activos: un banner con activo=false (borrador,
-- pausado) nunca llega al cliente. La escritura pasa siempre por el dashboard
-- (service_role), no desde la app.
drop policy if exists "Ver banners activos" on public.banner_ads;
create policy "Ver banners activos" on public.banner_ads
  for select using (activo = true);

-- Índice para el orden de lectura del carrusel.
create index if not exists banner_ads_activos_idx
  on public.banner_ads (orden) where activo;

-- ── Ejemplo de carga manual (borrar / adaptar) ──────────────────────────────
-- insert into public.banner_ads (imagen_url, link_url, activo, orden) values
--   ('https://.../banner-1.jpg', 'https://anunciante-1.com',  true, 1),
--   ('https://.../banner-2.jpg', 'https://anunciante-2.com',  true, 2);
