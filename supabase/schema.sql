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

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────

alter table public.profiles     enable row level security;
alter table public.mascotas     enable row level security;
alter table public.alertas      enable row level security;
alter table public.sightings    enable row level security;
alter table public.posts        enable row level security;
alter table public.post_likes   enable row level security;
alter table public.post_comments enable row level security;

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
