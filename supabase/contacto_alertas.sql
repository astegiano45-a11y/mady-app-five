-- ─────────────────────────────────────────────────────────────────────────────
--  Contacto de alertas — botón "Lo vi — Contactar" del mapa
-- ─────────────────────────────────────────────────────────────────────────────
-- Problema: el teléfono de quien reporta vive en profiles.phone, pero la
-- única política RLS de "profiles" es "for all using (auth.uid() = id)" —
-- cada usuario solo puede leer su PROPIO perfil. Verificado en vivo: una
-- consulta anónima a profiles?id=eq.<otro_user_id> devuelve [] siempre.
--
-- Solución: en vez de aflojar el RLS de "profiles" (expondría toda la ficha
-- de cualquier usuario — email, avatar, etc. — a cualquiera), se agrega una
-- función security definer bien acotada, mismo patrón que ya usan
-- get_pending_adoption_requests() / respond_adoption_match() en schema.sql.
-- Solo devuelve name+phone de quien reportó UNA alerta puntual, y solo a
-- usuarios logueados (authenticated).

create or replace function public.get_alerta_contact(alerta_id uuid)
returns table (name text, phone text)
language plpgsql security definer as $$
begin
  return query
    select p.name, p.phone
    from public.alertas a
    join public.profiles p on p.id = a.user_id
    where a.id = alerta_id;
end;
$$;

revoke all on function public.get_alerta_contact(uuid) from public;
grant execute on function public.get_alerta_contact(uuid) to authenticated;

-- El "revoke ... from public" de arriba no alcanza en la práctica: este
-- proyecto de Supabase ya tiene privilegios por defecto que le dan EXECUTE
-- a "anon" a nivel de schema, así que sin esta línea cualquiera con la key
-- anónima (pública, embebida en el bundle de la app) podía llamar a la
-- función sin estar logueado. Verificado en vivo con curl antes de este fix.
revoke execute on function public.get_alerta_contact(uuid) from anon;
