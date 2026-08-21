-- ─────────────────────────────────────────────────────────────────────────────
--  Mady App · Schema completo
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles (extiende auth.users)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text not null,
  phone       text,
  avatar_url  text,
  zona        text default 'Río Grande',
  created_at  timestamptz default now()
);

-- Mascotas
create table public.mascotas (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  species     text not null default 'perro',  -- perro, gato, otro
  breed       text,
  age         text,
  color       text,
  description text,
  photo_url   text,
  status      text not null default 'home',   -- home, lost, found
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Alertas (mascotas perdidas/encontradas reportadas)
create table public.alertas (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  mascota_id   uuid references public.mascotas(id) on delete set null,
  type         text not null,  -- lost, found, adoption, sos
  name         text not null,
  description  text,
  photo_url    text,
  zone         text not null,
  lat          float,
  lng          float,
  status       text default 'active',  -- active, resolved
  created_at   timestamptz default now()
);

-- Avistamientos (alguien reporta haber visto a una mascota perdida, "lo vi acá")
-- NOTA: esta tabla ya existía en el proyecto de Supabase (creada a mano, no vía
-- este schema.sql) pero sin política de RLS para insert, así que nadie podía
-- reportar un avistamiento en la práctica. Se agrega acá para que el schema
-- documente lo que realmente existe en la base.
create table if not exists public.sightings (
  id           uuid default gen_random_uuid() primary key,
  alerta_id    uuid references public.alertas(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  lat          float not null,
  lng          float not null,
  description  text,
  created_at   timestamptz default now()
);

-- Comunidad: posts, likes y comentarios
-- NOTA: estas tres tablas ya existían en el proyecto de Supabase (creadas a mano,
-- no vía este schema.sql) pero "posts" no tenía política de UPDATE, así que
-- likes_count nunca se guardaba de verdad (el UPDATE fallaba en silencio por
-- RLS). Se documentan acá para que el schema refleje lo que realmente existe.
create table if not exists public.posts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  content      text not null,
  photo_url    text,
  category     text default 'general',
  likes_count  integer default 0,
  created_at   timestamptz default now()
);

create table if not exists public.post_likes (
  user_id      uuid references public.profiles(id) on delete cascade not null,
  post_id      uuid references public.posts(id) on delete cascade not null,
  created_at   timestamptz default now(),
  primary key (user_id, post_id)
);

create table if not exists public.post_comments (
  id           uuid default gen_random_uuid() primary key,
  post_id      uuid references public.posts(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  content      text not null,
  created_at   timestamptz default now()
);

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

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────

alter table public.profiles     enable row level security;
alter table public.mascotas     enable row level security;
alter table public.alertas      enable row level security;
alter table public.sightings    enable row level security;
alter table public.posts        enable row level security;
alter table public.post_likes   enable row level security;
alter table public.post_comments enable row level security;
alter table public.adoptant_profiles enable row level security;
alter table public.adoption_matches  enable row level security;

-- Profiles: cada uno ve y edita solo el suyo
create policy "Perfil propio" on public.profiles
  for all using (auth.uid() = id);

-- Mascotas: dueño puede todo, todos pueden ver
create policy "Ver mascotas" on public.mascotas
  for select using (true);
create policy "Gestionar mascotas propias" on public.mascotas
  for all using (auth.uid() = user_id);

-- Alertas: todos ven, solo el dueño modifica
create policy "Ver alertas" on public.alertas
  for select using (true);
create policy "Gestionar alertas propias" on public.alertas
  for all using (auth.uid() = user_id);

-- Avistamientos: todos ven, cualquier usuario autenticado reporta (a su nombre)
create policy "Ver avistamientos" on public.sightings
  for select using (true);
create policy "Reportar avistamiento propio" on public.sightings
  for insert with check (auth.uid() = user_id);

-- Posts: todos ven, solo el dueño crea/borra. A propósito NO hay policy de
-- UPDATE: eso dejaría a cualquier usuario autenticado reescribir el contenido,
-- la foto o el dueño de un post ajeno. El conteo de likes se actualiza en
-- cambio a través de la función increment_post_likes() (más abajo), que corre
-- con permisos de owner (SECURITY DEFINER) y solo toca esa columna.
create policy "Ver posts" on public.posts
  for select using (true);
create policy "Crear posts" on public.posts
  for insert with check (auth.uid() = user_id);
create policy "Eliminar post propio" on public.posts
  for delete using (auth.uid() = user_id);

-- Likes: cada uno gestiona sus propios likes (dar/sacar like)
create policy "Dar like" on public.post_likes
  for all using (auth.uid() = user_id);
create policy "Ver likes" on public.post_likes
  for select using (true);

-- Comentarios: todos ven, cualquier usuario autenticado comenta a su nombre,
-- solo el autor borra el propio
create policy "Ver comentarios" on public.post_comments
  for select using (true);
create policy "Comentar" on public.post_comments
  for insert with check (auth.uid() = user_id);
create policy "Borrar comentario propio" on public.post_comments
  for delete using (auth.uid() = user_id);

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

-- Incrementa/decrementa likes_count de forma atómica sin necesitar un UPDATE
-- policy abierto sobre "posts". SECURITY DEFINER: corre con los permisos del
-- owner de la función (bypassea RLS), pero solo expone esta operación acotada.
create or replace function public.increment_post_likes(post_id uuid, delta int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  update public.posts
  set likes_count = greatest(0, coalesce(likes_count, 0) + delta)
  where id = post_id
  returning likes_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_post_likes(uuid, int) from public;
grant execute on function public.increment_post_likes(uuid, int) to authenticated;

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

-- ─── Trigger: crear perfil al registrarse ─────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Storage bucket para fotos ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('mascotas', 'mascotas', true)
on conflict do nothing;

create policy "Fotos públicas" on storage.objects
  for select using (bucket_id = 'mascotas');
create policy "Subir fotos" on storage.objects
  for insert with check (bucket_id = 'mascotas' and auth.role() = 'authenticated');
