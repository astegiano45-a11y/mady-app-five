# Tests RLS — flujo de adopción

Batería en vivo contra la base real de Supabase. Verifica que:

- el **swipe de adopción** funciona (no volvió el `42P17 infinite recursion`)
- la **fuga #1** sigue cerrada: un usuario logueado no lee el `adoptant_profile` de otro
- la **fuga #2** sigue cerrada: el adoptante no puede setear `owner_liked` (ni por UPDATE
  directo, ni por INSERT, ni llamando `respond_adoption_match()` sin ser el dueño de la alerta)
- el camino legítimo sigue vivo: el dueño de la alerta aprueba/rechaza vía la RPC

Corre contra `fix_rls_adopcion.sql` + `fix_rls_adopcion_v2.sql` ya aplicados.

## Requisitos

- 2 cuentas de prueba **descartables** (A = adoptante, B = dueña de la alerta).
  - Si el proyecto **no** exige confirmación de email → `AUTO_SIGNUP=1` las crea solas.
  - Si la exige → creá las 2 desde el dashboard (Authentication → Add user → *Auto Confirm*).
- Node 18+ y `npm install` hecho (usa `@supabase/supabase-js`, ya es dependencia).

## Correr

```bash
# PowerShell
$env:A_EMAIL="a-test@example.com"; $env:A_PASS="..."; $env:B_EMAIL="b-test@example.com"; $env:B_PASS="..."; $env:AUTO_SIGNUP="1"
node supabase/tests/rls_adopcion.mjs
```

```bash
# bash
A_EMAIL=a-test@example.com A_PASS=... B_EMAIL=b-test@example.com B_PASS=... AUTO_SIGNUP=1 \
  node supabase/tests/rls_adopcion.mjs
```

Flags opcionales: `KEEP=1` (no borra los datos de prueba), `SUPABASE_URL` / `SUPABASE_ANON_KEY`.

Sale con código `0` si todo pasa, `1` si algún test falla, `2` si faltan credenciales.
El script limpia sus propios datos (alertas, matches, perfil de A) al terminar salvo `KEEP=1`.
