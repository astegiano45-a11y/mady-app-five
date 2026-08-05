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

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────

alter table public.profiles  enable row level security;
alter table public.mascotas  enable row level security;
alter table public.alertas   enable row level security;

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
