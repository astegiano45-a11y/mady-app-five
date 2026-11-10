-- ─────────────────────────────────────────────────────────────────────────────
--  Avistamientos: created_at con zona horaria (Etapa 1, docs/plan-avistamientos.md)
--
--  sightings.created_at se creó a mano como "timestamp" (SIN zona), a
--  diferencia de alertas/posts/mascotas que son "timestamptz". Supabase guarda
--  ahí la hora UTC del servidor, pero la API la devuelve sin "Z"
--  ("2026-11-10T01:55:19") y el navegador la interpreta como hora local:
--  en Argentina (UTC−3) cada avistamiento quedaba 3 horas corrido.
--
--  Verificado en vivo el 10/11/2026: un avistamiento cargado a las 01:55:19 UTC
--  quedó guardado como 01:55:19, o sea que los valores existentes YA son UTC.
--  Por eso la conversión los toma "at time zone 'UTC'" (no cambia el instante).
--
--  La app ya tolera ambos formatos (parseDbDate en src/utils/sightings.js),
--  así que esta migración se puede correr antes o después del deploy.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.sightings
  alter column created_at type timestamptz using created_at at time zone 'UTC',
  alter column created_at set default now(),
  alter column created_at set not null;

-- Para la etapa 3 (recorrido ordenado por hora de cada alerta)
create index if not exists sightings_alerta_created_idx
  on public.sightings (alerta_id, created_at);
