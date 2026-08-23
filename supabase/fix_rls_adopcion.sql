-- ─────────────────────────────────────────────────────────────────────────────
--  Fix RLS — 2 problemas críticos encontrados en la auditoría empírica
--  (probado con cuentas descartables, no con datos reales)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) adoptant_profiles: había una política de SELECT extra, no documentada
-- en este repo (creada a mano en algún momento, mismo patrón que ya se vio
-- con otras tablas del proyecto), que dejaba leer el perfil de adoptante de
-- CUALQUIER usuario a cualquier otro usuario logueado -- incluidas las
-- respuestas del cuestionario de responsabilidad (questions_answers).
-- Verificado en vivo: una cuenta B leyó sin filtro el perfil completo de
-- una cuenta A.
--
-- Como no sabemos el nombre real de esa política vieja, se borran TODAS
-- las políticas existentes en la tabla (sea cual sea su nombre) y se
-- recrea una sola, correcta: cada uno ve y edita solo la suya. El dueño de
-- una alerta sigue pudiendo ver los datos del adoptante al decidir una
-- solicitud a través de get_pending_adoption_requests() (SECURITY DEFINER,
-- ya existente, no se toca acá) -- no necesita leer esta tabla directo.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'adoptant_profiles'
  loop
    execute format('drop policy %I on public.adoptant_profiles', pol.policyname);
  end loop;
end $$;

create policy "Perfil de adoptante propio" on public.adoptant_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) adoption_matches: la política "Adoptante gestiona sus matches" (for
-- all) le permitía al adoptante escribir CUALQUIER columna de su fila por
-- UPDATE directo -- incluido owner_liked, la columna que se supone que
-- solo puede tocar respond_adoption_match() (verifica del lado del
-- servidor que quien llama sea el dueño de la alerta). Verificado en
-- vivo: un adoptante se auto-aprobó (owner_liked=true) escribiendo
-- directo por tabla, sin que el dueño hiciera nada.
--
-- Se reemplaza por 4 políticas separadas. El UPDATE tiene un WITH CHECK
-- que compara el owner_liked de la fila resultante contra el que ya tenía
-- guardado (vía subconsulta a la misma tabla) -- si no coincide, la
-- policy rechaza el UPDATE. adoptant_liked sigue editable libremente por
-- el adoptante (lo necesita el swipe "Me gusta"/"No me interesa" --
-- likeAdoption() en adoptantService.js hace un upsert directo por tabla).
-- La política de SELECT del dueño ("Dueno ve solicitudes de sus alertas")
-- no se toca, sigue igual.
drop policy if exists "Adoptante gestiona sus matches" on public.adoption_matches;

create policy "Adoptante ve sus matches" on public.adoption_matches
  for select using (auth.uid() = adoptant_id);

create policy "Adoptante crea su match" on public.adoption_matches
  for insert with check (auth.uid() = adoptant_id);

create policy "Adoptante actualiza su like (no owner_liked)" on public.adoption_matches
  for update using (auth.uid() = adoptant_id)
  with check (
    auth.uid() = adoptant_id
    and owner_liked is not distinct from (
      select old_row.owner_liked
      from public.adoption_matches old_row
      where old_row.id = adoption_matches.id
    )
  );

create policy "Adoptante borra su match" on public.adoption_matches
  for delete using (auth.uid() = adoptant_id);
