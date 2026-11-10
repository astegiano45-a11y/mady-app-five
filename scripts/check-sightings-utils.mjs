// Verificación de src/utils/geo.js y src/utils/sightings.js (sin dependencias).
// Uso: node scripts/check-sightings-utils.mjs
// Sale con código 1 si algún caso falla.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Los módulos del app usan imports sin extensión ("./geo"), que Node ESM no
// resuelve. Se copian a una carpeta temporal agregando ".js" a los imports.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'mady-utils-'));
for (const f of ['geo.js', 'sightings.js']) {
  const src = readFileSync(join(root, 'src', 'utils', f), 'utf8')
    .replace(/from '(\.\/[^']+)'/g, "from '$1.js'");
  writeFileSync(join(tmp, f), src);
}
const { parseDbDate, timeAgo, sightingPlaceLabel, sightingNote } =
  await import(pathToFileURL(join(tmp, 'sightings.js')).href);
const { nearestZone, formatDistance, distanceKm } =
  await import(pathToFileURL(join(tmp, 'geo.js')).href);

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('✓', name); };

ok('fecha sin zona (columna timestamp) se lee como UTC', () => {
  assert.equal(parseDbDate('2026-11-10T01:55:19.035293').toISOString(), '2026-11-10T01:55:19.035Z');
});
ok('fecha con +00:00 (timestamptz) no se toca', () => {
  assert.equal(parseDbDate('2026-11-10T01:55:19.035293+00:00').toISOString(), '2026-11-10T01:55:19.035Z');
});
ok('fecha con Z no se toca', () => {
  assert.equal(parseDbDate('2026-11-10T01:55:19Z').toISOString(), '2026-11-10T01:55:19.000Z');
});
ok('fecha con -03:00 se respeta', () => {
  assert.equal(parseDbDate('2026-11-09T22:55:19-03:00').toISOString(), '2026-11-10T01:55:19.000Z');
});
ok('timeAgo: recién cargado dice "recién", no -180 min', () => {
  const now = Date.parse('2026-11-10T01:55:40Z');
  assert.equal(timeAgo('2026-11-10T01:55:19.035293', now), 'recién');
});
ok('timeAgo: minutos, horas y días', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  assert.equal(timeAgo('2026-11-10T11:45:00', now), 'hace 15 min');
  assert.equal(timeAgo('2026-11-10T09:00:00', now), 'hace 3 h');
  assert.equal(timeAgo('2026-11-09T11:00:00', now), 'hace 1 día');
  assert.equal(timeAgo('2026-11-07T11:00:00', now), 'hace 3 días');
});
ok('timeAgo: valor vacío o inválido no rompe', () => {
  assert.equal(timeAgo(null), '');
  assert.equal(timeAgo('no-es-fecha'), '');
});
ok('zona más cercana', () => {
  assert.equal(nearestZone(-53.7920, -67.7250), 'Chacra II');
  assert.equal(nearestZone(-53.8045, -67.6960), 'Margen Sur');
  assert.equal(nearestZone(undefined, -67.7), null);
});
ok('distancia Haversine ~1 km', () => {
  const d = distanceKm(-53.80, -67.70, -53.809, -67.70); // 0.009° lat ≈ 1 km
  assert.ok(d > 0.98 && d < 1.02, `d=${d}`);
});
ok('formatDistance', () => {
  assert.equal(formatDistance(0.35), 'a 350 m');
  assert.equal(formatDistance(1.234), 'a 1,2 km');
});
ok('texto del lugar usa la ubicación REAL del avistamiento', () => {
  // Los 2 avistamientos de la prueba del 9/11: alerta en Margen Sur,
  // vistos en dos puntos distintos. Antes los dos decían "Visto cerca de Margen Sur".
  const lost = { lat: -53.8045, lng: -67.6960 };
  const a = sightingPlaceLabel({ lat: -53.7990, lng: -67.6880 }, lost);
  const b = sightingPlaceLabel({ lat: -53.7925, lng: -67.6990 }, lost);
  assert.notEqual(a, b);
  assert.match(a, /^Cerca de .+ · a \d+ m de donde se perdió$/);
  assert.match(b, /^Cerca de .+ · a 1,\d km de donde se perdió$/);
});
ok('texto del lugar sin punto de pérdida', () => {
  assert.equal(sightingPlaceLabel({ lat: -53.7920, lng: -67.7250 }, null), 'Cerca de Chacra II');
  assert.equal(sightingPlaceLabel({}, null), 'Ubicación no disponible');
});
ok('nota: ignora el texto automático viejo, muestra notas reales', () => {
  assert.equal(sightingNote({ description: 'Visto cerca de Margen Sur' }), '');
  assert.equal(sightingNote({ description: null }), '');
  assert.equal(sightingNote({ description: 'Iba hacia la costanera' }), 'Iba hacia la costanera');
});

console.log(`\n${n} casos OK`);
