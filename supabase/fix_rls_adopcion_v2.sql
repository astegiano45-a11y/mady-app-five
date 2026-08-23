-- ─────────────────────────────────────────────────────────────────────────────
--  Fix del fix -- adoption_matches quedó con "infinite recursion detected in
--  policy for relation adoption_matches" (42P17) después de correr
--  fix_rls_adopcion.sql. Eso rompe CUALQUIER update a la tabla -- incluido
--  el swipe real "Me gusta"/"No me interesa" en producción, ahora mismo.
--  Verificado en vivo con las cuentas de prueba antes de escribir este fix.
--
--  Causa: el WITH CHECK del UPDATE hacía una subconsulta a la MISMA tabla
--  (adoption_matches) para leer el owner_liked viejo. Esa subconsulta
--  vuelve a evaluar RLS sobre adoption_matches, y en Postgres eso puede
--  disparar "infinite recursion detected in policy" cuando una policy se
--  termina referenciando a sí misma dentro de su propio chequeo.
--
--  Solución: las policies son por FILA, no por columna -- no son la
--  herramienta correcta para "esta columna la puede tocar cualquiera menos
--  esta otra". Se saca la protección de owner_liked de RLS y se pasa a un
--  trigger, que tiene acceso directo a OLD/NEW sin subconsultas (no puede
--  recursionar). respond_adoption_match() marca un flag de sesión antes de
--  su UPDATE legítimo; el trigger revierte cualquier cambio a owner_liked
--  que no venga acompañado de ese flag -- tanto en UPDATE como en INSERT
--  (por las dudas alguien intente crear el match ya con owner_liked=true
--  desde el vamos).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Vuelve a una sola policy simple, como la original -- sin el WITH CHECK
-- autorreferenciado que causaba la recursión.
drop policy if exists "Adoptante ve sus matches" on public.adoption_matches;
drop policy if exists "Adoptante crea su match" on public.adoption_matches;
drop policy if exists "Adoptante actualiza su like (no owner_liked)" on public.adoption_matches;
drop policy if exists "Adoptante borra su match" on public.adoption_matches;
drop policy if exists "Adoptante gestiona sus matches" on public.adoption_matches;

create policy "Adoptante gestiona sus matches" on public.adoption_matches
  for all using (auth.uid() = adoptant_id) with check (auth.uid() = adoptant_id);

-- 2) Trigger: protege owner_liked a nivel de columna, sin pasar por RLS.
create or replace function public.protect_owner_liked()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.owner_liked := null; -- nunca se setea al crear el match
  elsif tg_op = 'UPDATE' then
    if new.owner_liked is distinct from old.owner_liked
       and coalesce(current_setting('mady.allow_owner_liked_change', true), '') <> 'true' then
      new.owner_liked := old.owner_liked; -- revierte el cambio no autorizado
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_owner_liked on public.adoption_matches;
create trigger trg_protect_owner_liked
  before insert or update on public.adoption_matches
  for each row execute function public.protect_owner_liked();

-- 3) respond_adoption_match(): marca el flag de sesión antes de su UPDATE
-- legítimo, para que el trigger lo deje pasar. Todo lo demás de la función
-- queda igual (sigue verificando que quien llama sea el dueño de la
-- alerta relacionada).
create or replace function public.respond_adoption_match(match_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('mady.allow_owner_liked_change', 'true', true);
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

-- Por si el cache de PostgREST quedó desactualizado (vimos un error
-- "PGRST202 ... no matches were found in the schema cache" al probar
-- respond_adoption_match después del fix anterior).
notify pgrst, 'reload schema';
