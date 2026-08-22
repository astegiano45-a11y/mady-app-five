-- ─────────────────────────────────────────────────────────────────────────────
--  Teléfono de contacto en el perfil
-- ─────────────────────────────────────────────────────────────────────────────
-- Hallazgo: RegisterScreen.js ya le pide el teléfono al usuario en el paso 2
-- del registro (opcional) y lo manda a supabase.auth.signUp() como
-- options.data.phone — pero handle_new_user(), el trigger que crea la fila
-- en public.profiles al registrarse, solo copiaba "name" desde
-- raw_user_meta_data. El teléfono quedaba guardado en auth.users (metadata
-- interna de Supabase Auth) pero nunca llegaba a profiles.phone — que es la
-- columna que get_alerta_contact() (ver contacto_alertas.sql) realmente lee.
-- Resultado: aunque alguien completara el teléfono al registrarse, el botón
-- "Lo vi — Contactar" lo iba a ver igual como "sin teléfono" para siempre.
--
-- Este fix cubre los registros NUEVOS a partir de ahora. Para cuentas que
-- ya existen (como la única de prueba que hay hoy en la base), hay que
-- cargar el teléfono a mano una vez desde Perfil → Cuenta → "Teléfono de
-- contacto" (pantalla nueva agregada en PerfilUsuarioScreen.js).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;
