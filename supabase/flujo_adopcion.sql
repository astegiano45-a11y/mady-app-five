-- Adopción: perfil de adoptante y matches (like del adoptante / aprobación
-- del dueño). Igual que posts/sightings, ya existían en Supabase creadas a
-- mano, sin RLS -adoptant_profiles era legible por cualquiera con la clave
-- anónima, sin login-. Se documentan y se cierran acá.
create table if not exists public.adoptant_profiles (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references public.profiles(id) on delete cascade not null unique,
  dog_size           text default 'any',
  preferred_breeds   text[] default '{}',
  experience_level   text,
  space_type         text,
  time_availability  text,
  lives_with         text[] default '{}',
  questions_answers  jsonb default '{}',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists public.adoption_matches (
  id              uuid default gen_random_uuid() primary key,
  adoptant_id     uuid references public.profiles(id) on delete cascade not null,
  alerta_id       uuid references public.alertas(id) on delete cascade not null,
  adoptant_liked  boolean,
  owner_liked     boolean,
  created_at      timestamptz default now(),
  unique (adoptant_id, alerta_id)
);

-- adoption_matches ya existía en Supabase antes de esta migración (por eso
-- el "create table if not exists" de arriba no la tocó), y su columna
-- owner_liked tenía un default de false en vez de sin default (NULL). Con
-- ese default, toda solicitud nueva nacía con owner_liked=false —
-- indistinguible de una rechazada — y get_pending_adoption_requests() (que
-- filtra "owner_liked is null" para detectar pendientes) nunca la mostraba.
alter table public.adoption_matches alter column owner_liked drop default;

alter table public.adoptant_profiles enable row level security;
alter table public.adoption_matches  enable row level security;

-- Perfil de adoptante: cada uno ve y edita solo el suyo. Antes no tenía RLS
-- en absoluto (cualquiera lo leía sin login) — ahora queda tan cerrado como
-- "profiles". El dueño de una alerta accede a los datos que necesita para
-- decidir una solicitud a través de get_pending_adoption_requests() (más
-- abajo), no leyendo esta tabla directo.
create policy "Perfil de adoptante propio" on public.adoptant_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Matches de adopción: el adoptante gestiona sus propios "me gusta"
-- (adoptant_liked). El dueño de la alerta relacionada puede VER las
-- solicitudes que le llegaron, pero aprobar/rechazar (owner_liked) pasa por
-- respond_adoption_match() -RPC acotada- en vez de un UPDATE policy que le
-- permitiría al dueño tocar columnas del adoptante.
create policy "Adoptante gestiona sus matches" on public.adoption_matches
  for all using (auth.uid() = adoptant_id) with check (auth.uid() = adoptant_id);
create policy "Dueno ve solicitudes de sus alertas" on public.adoption_matches
  for select using (
    exists (
      select 1 from public.alertas al
      where al.id = adoption_matches.alerta_id and al.user_id = auth.uid()
    )
  );

-- Solicitudes de adopción pendientes sobre MIS alertas, con el resumen del
-- adoptante ya armado (nombre + preferencias + respuestas del cuestionario).
-- SECURITY DEFINER: bypassea RLS para el join, pero el where auth.uid()
-- acota el resultado a lo que le corresponde a quien llama.
-- am.created_at::timestamptz: adoption_matches ya existía en Supabase antes
-- de esta migración (por eso el "create table if not exists" de arriba no
-- la tocó), y su columna created_at quedó tipada como timestamp SIN zona
-- horaria. Sin el cast, esta función falla siempre con "structure of query
-- does not match function result type" porque declara requested_at como
-- timestamptz.
create or replace function public.get_pending_adoption_requests()
returns table (
  match_id uuid, alerta_id uuid, alerta_name text, alerta_photo_url text,
  adoptant_name text, dog_size text, experience_level text,
  space_type text, time_availability text, lives_with text[],
  questions_answers jsonb, requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select am.id, al.id, al.name, al.photo_url, pr.name,
         ap.dog_size, ap.experience_level, ap.space_type, ap.time_availability,
         ap.lives_with, ap.questions_answers, am.created_at::timestamptz
  from public.adoption_matches am
  join public.alertas al on al.id = am.alerta_id
  left join public.adoptant_profiles ap on ap.user_id = am.adoptant_id
  left join public.profiles pr on pr.id = am.adoptant_id
  where al.user_id = auth.uid()
    and am.adoptant_liked = true
    and am.owner_liked is null;
end;
$$;

revoke all on function public.get_pending_adoption_requests() from public;
grant execute on function public.get_pending_adoption_requests() to authenticated;

-- Aprobar/rechazar una solicitud: solo si quien llama es el dueño de la
-- alerta relacionada. No usar un UPDATE policy abierto acá porque la fila
-- pertenece conceptualmente al adoptante (adoptant_id), no al dueño.
create or replace function public.respond_adoption_match(match_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.adoption_matches am
  set owner_liked = approve
  from public.alertas al
  where am.id = match_id
    and al.id = am.alerta_id
    and al.user_id = auth.uid();
end;
$$;

revoke all on function public.respond_adoption_match(uuid, boolean) from public;
grant execute on function public.respond_adoption_match(uuid, boolean) to authenticated;
