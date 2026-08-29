// ─────────────────────────────────────────────────────────────────────────────
//  Batería de tests RLS — flujo de adopción (adoptant_profiles / adoption_matches)
//
//  Verifica en vivo, contra la base real, con 2 cuentas descartables:
//
//    T1  El swipe de adopción funciona          (likeAdoption / upsert, sin 42P17)
//    T2  Fuga #2a: el adoptante NO se auto-aprueba por UPDATE directo de owner_liked
//    T3  Fuga #2b: un INSERT con owner_liked=true nace anulado (owner_liked=null)
//    T4  Fuga #2c: el adoptante NO aprueba llamando respond_adoption_match() (no es dueño)
//    T5  El camino legítimo sigue vivo: el dueño de la alerta aprueba y rechaza vía RPC
//    T6  Fuga #1: un usuario logueado NO lee el adoptant_profile de otro
//
//  Uso:
//    A_EMAIL=... A_PASS=... B_EMAIL=... B_PASS=... node supabase/tests/rls_adopcion.mjs
//
//  Variables:
//    A_EMAIL / A_PASS   cuenta "adoptante" (la que intenta las trampas)   [requerido]
//    B_EMAIL / B_PASS   cuenta "dueña de la alerta"                       [requerido]
//    AUTO_SIGNUP=1      intenta signUp() si el login falla (necesita que el
//                       proyecto NO exija confirmación de email)
//    KEEP=1             no borra los datos de prueba al terminar
//    SUPABASE_URL / SUPABASE_ANON_KEY   override (default: los del repo)
//
//  Sale con código 1 si algún test falla.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://pjdkllususshewxxyzwl.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable__uS-__PaV6q6wMLkl11bvQ_7ElTzvqw';

const { A_EMAIL, A_PASS, B_EMAIL, B_PASS } = process.env;
const AUTO_SIGNUP = process.env.AUTO_SIGNUP === '1';
const KEEP = process.env.KEEP === '1';
const TAG = `TEST-RLS-${Date.now()}`;

if (!A_EMAIL || !A_PASS || !B_EMAIL || !B_PASS) {
  console.error(
    'Faltan credenciales. Uso:\n' +
      '  A_EMAIL=... A_PASS=... B_EMAIL=... B_PASS=... node supabase/tests/rls_adopcion.mjs',
  );
  process.exit(2);
}

// ── helpers ──────────────────────────────────────────────────────────────────
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  const mark = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${mark}  ${name}${detail ? `  — ${detail}` : ''}`);
}
function fresh() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function login(label, email, pass) {
  const sb = fresh();
  let { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error && AUTO_SIGNUP) {
    console.log(`  (${label}) login falló, intento signUp: ${error.message}`);
    const up = await sb.auth.signUp({ email, password: pass });
    if (up.error) throw new Error(`signUp ${label}: ${up.error.message}`);
    if (!up.data.session)
      throw new Error(
        `signUp ${label} sin sesión — el proyecto exige confirmación de email. ` +
          `Creá y confirmá las 2 cuentas desde el dashboard de Supabase y volvé a correr.`,
      );
    ({ data } = up);
  } else if (error) {
    throw new Error(`login ${label}: ${error.message}`);
  }
  const uid = data.user?.id || data.session?.user?.id;
  if (!uid) throw new Error(`login ${label}: sin user id`);
  console.log(`  (${label}) ${email} → ${uid}`);
  return { sb, uid };
}

// ── main ─────────────────────────────────────────────────────────────────────
let A, B, alerta1, alerta2, match1;

try {
  console.log(`\n· URL: ${SUPABASE_URL}`);
  console.log(`· TAG: ${TAG}\n`);

  A = await login('A/adoptante', A_EMAIL, A_PASS);
  B = await login('B/dueña', B_EMAIL, B_PASS);
  if (A.uid === B.uid) throw new Error('A y B son la misma cuenta — usá 2 distintas.');

  // ── setup ──────────────────────────────────────────────────────────────────
  // Perfil de adoptante de A, con un marcador reconocible en el cuestionario.
  {
    const { error } = await A.sb.from('adoptant_profiles').upsert(
      {
        user_id: A.uid,
        dog_size: 'any',
        experience_level: 'some', // valores válidos: none | some | lots
        space_type: 'apartment', // apartment | house | farm
        time_availability: 'some', // little | some | lots
        lives_with: ['pareja'],
        questions_answers: { _marker: TAG, compromiso: 'sí' },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error(`setup perfil A: ${error.message}`);
  }

  // 2 alertas de adopción, propiedad de B.
  for (const slot of ['1', '2']) {
    const { data, error } = await B.sb
      .from('alertas')
      .insert({ user_id: B.uid, type: 'adoption', name: `${TAG}-alerta${slot}`, zone: TAG })
      .select()
      .single();
    if (error) throw new Error(`setup alerta${slot}: ${error.message}`);
    if (slot === '1') alerta1 = data.id;
    else alerta2 = data.id;
  }
  console.log(`  alertas de B: ${alerta1} , ${alerta2}\n`);

  // ── T1 · el swipe funciona (upsert sobre adoption_matches, sin 42P17) ───────
  {
    const swipe = (liked) =>
      A.sb
        .from('adoption_matches')
        .upsert(
          { adoptant_id: A.uid, alerta_id: alerta1, adoptant_liked: liked },
          { onConflict: 'adoptant_id,alerta_id' },
        )
        .select()
        .single();

    const r1 = await swipe(true);
    const r2 = await swipe(false); // "No me interesa" sobre la misma mascota
    const r3 = await swipe(true); // vuelve a "Me gusta"

    const err = r1.error || r2.error || r3.error;
    const sameRow =
      !err && r1.data && r2.data && r3.data && r1.data.id === r2.data.id && r2.data.id === r3.data.id;
    match1 = r3.data?.id;

    check(
      'T1 · swipe de adopción (like/unlike/like)',
      sameRow && r3.data.adoptant_liked === true && !err,
      err
        ? `error: ${err.code || ''} ${err.message}`
        : sameRow
        ? 'upsert actualiza la misma fila, sin recursión'
        : 'el upsert creó filas nuevas en vez de actualizar',
    );
    check(
      'T1b · owner_liked sigue null tras el swipe',
      !err && r3.data && r3.data.owner_liked === null,
      `owner_liked = ${JSON.stringify(r3.data?.owner_liked)}`,
    );
  }

  // ── T2 · fuga #2a: UPDATE directo de owner_liked por el adoptante ───────────
  {
    await A.sb.from('adoption_matches').update({ owner_liked: true }).eq('id', match1);
    const { data } = await A.sb
      .from('adoption_matches')
      .select('owner_liked')
      .eq('id', match1)
      .single();
    check(
      'T2 · adoptante NO se auto-aprueba por UPDATE directo',
      data && data.owner_liked === null,
      `owner_liked persistido = ${JSON.stringify(data?.owner_liked)} (se espera null)`,
    );
  }

  // ── T3 · fuga #2b: INSERT con owner_liked=true nace anulado ─────────────────
  {
    const { data, error } = await A.sb
      .from('adoption_matches')
      .insert({
        adoptant_id: A.uid,
        alerta_id: alerta2,
        adoptant_liked: true,
        owner_liked: true, // intento de nacer aprobado
      })
      .select()
      .single();
    check(
      'T3 · INSERT con owner_liked=true nace anulado',
      !error && data && data.owner_liked === null,
      error ? `error: ${error.message}` : `owner_liked = ${JSON.stringify(data?.owner_liked)}`,
    );
  }

  // ── T4 · fuga #2c: el adoptante llama la RPC sobre su propio match ──────────
  {
    const { error } = await A.sb.rpc('respond_adoption_match', {
      match_id: match1,
      approve: true,
    });
    const { data } = await A.sb
      .from('adoption_matches')
      .select('owner_liked')
      .eq('id', match1)
      .single();
    check(
      'T4 · respond_adoption_match() no hace nada si no sos el dueño',
      data && data.owner_liked === null,
      error
        ? `rpc error (aceptable): ${error.message}`
        : `owner_liked = ${JSON.stringify(data?.owner_liked)} (se espera null)`,
    );
  }

  // ── T5 · camino legítimo: el dueño aprueba y rechaza vía RPC ────────────────
  {
    const { error: eApprove } = await B.sb.rpc('respond_adoption_match', {
      match_id: match1,
      approve: true,
    });
    const { data: afterApprove } = await B.sb
      .from('adoption_matches')
      .select('owner_liked')
      .eq('id', match1)
      .single();
    check(
      'T5a · el dueño de la alerta aprueba (owner_liked=true)',
      !eApprove && afterApprove && afterApprove.owner_liked === true,
      eApprove ? `error: ${eApprove.message}` : `owner_liked = ${JSON.stringify(afterApprove?.owner_liked)}`,
    );

    const { error: eReject } = await B.sb.rpc('respond_adoption_match', {
      match_id: match1,
      approve: false,
    });
    const { data: afterReject } = await B.sb
      .from('adoption_matches')
      .select('owner_liked')
      .eq('id', match1)
      .single();
    check(
      'T5b · el dueño rechaza (owner_liked=false)',
      !eReject && afterReject && afterReject.owner_liked === false,
      eReject ? `error: ${eReject.message}` : `owner_liked = ${JSON.stringify(afterReject?.owner_liked)}`,
    );

    // get_pending_adoption_requests(): B ve la solicitud pendiente, A no ve nada.
    // (volvemos a dejar el match como pendiente para esta parte)
    try {
      await B.sb.rpc('respond_adoption_match', { match_id: match1, approve: null });
    } catch { /* si null no es válido, el match queda en false y B verá 0 pendientes */ }
    const pendingB = await B.sb.rpc('get_pending_adoption_requests');
    const pendingA = await A.sb.rpc('get_pending_adoption_requests');
    const listB = pendingB.data || [];
    const listA = pendingA.data || [];
    check(
      'T5c · get_pending_adoption_requests(): sólo lo ve el dueño',
      !pendingB.error &&
        !pendingA.error &&
        !listA.some((r) => r.alerta_id === alerta1 || r.alerta_id === alerta2),
      `B: ${listB.length} fila(s) · A: ${listA.length} fila(s) (A no debe ver las alertas ${TAG})`,
    );
  }

  // ── T6 · fuga #1: perfil de adoptante ajeno ────────────────────────────────
  {
    const byFilter = await B.sb.from('adoptant_profiles').select('*').eq('user_id', A.uid);
    const noFilter = await B.sb.from('adoptant_profiles').select('*');
    const rowsFilter = byFilter.data || [];
    const rowsAll = noFilter.data || [];
    const leaked =
      rowsFilter.length > 0 ||
      rowsAll.some((r) => r.user_id !== B.uid) ||
      JSON.stringify(rowsAll).includes(TAG);
    check(
      'T6 · B no lee el adoptant_profile de A',
      !leaked,
      `filtrado por user_id=A: ${rowsFilter.length} fila(s) · select sin filtro: ${rowsAll.length} fila(s) ` +
        `(todas deben ser de B; 0 si B no tiene perfil)`,
    );

    const aReadsB = await A.sb.from('adoptant_profiles').select('*').eq('user_id', B.uid);
    check(
      'T6b · A tampoco lee el perfil de B',
      (aReadsB.data || []).length === 0,
      `${(aReadsB.data || []).length} fila(s)`,
    );
  }
} catch (err) {
  console.error(`\n💥 ${err.message}`);
  results.push({ name: 'ejecución', pass: false, detail: err.message });
} finally {
  // ── cleanup ────────────────────────────────────────────────────────────────
  if (!KEEP && A && B) {
    try {
      await A.sb
        .from('adoption_matches')
        .delete()
        .eq('adoptant_id', A.uid)
        .in('alerta_id', [alerta1, alerta2].filter(Boolean));
      if (alerta1) await B.sb.from('alertas').delete().eq('id', alerta1);
      if (alerta2) await B.sb.from('alertas').delete().eq('id', alerta2);
      await A.sb.from('adoptant_profiles').delete().eq('user_id', A.uid);
      console.log('\n· limpieza ok');
    } catch (e) {
      console.log(`\n· limpieza parcial: ${e.message}`);
    }
  } else if (KEEP) {
    console.log('\n· KEEP=1 — datos de prueba NO borrados');
  }

  // ── resumen ────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.pass);
  console.log('\n─────────────────────────────────────────────');
  console.log(`${results.length - failed.length}/${results.length} OK`);
  if (failed.length) {
    console.log('FALLARON:');
    for (const f of failed) console.log(`  ❌ ${f.name} — ${f.detail}`);
    process.exit(1);
  }
  console.log('✅ Todo verde: swipe restaurado y las 2 fugas siguen cerradas.');
  process.exit(0);
}
