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
for (const f of ['geo.js', 'sightings.js', 'track.js']) {
  const src = readFileSync(join(root, 'src', 'utils', f), 'utf8')
    .replace(/from '(\.\/[^']+)'/g, "from '$1.js'");
  writeFileSync(join(tmp, f), src);
}
const { parseDbDate, timeAgo, sightingPlaceLabel, sightingNote } =
  await import(pathToFileURL(join(tmp, 'sightings.js')).href);
const { nearestZone, formatDistance, distanceKm } =
  await import(pathToFileURL(join(tmp, 'geo.js')).href);
const { buildTrack, searchRadiusMeters } = await import(pathToFileURL(join(tmp, 'track.js')).href);

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

// ── Etapa 3: recorrido ──────────────────────────────────────────────────────
const pinExacto = { name: 'Mady', lat: -53.8045, lng: -67.6960, exactLocation: true };
const avist = [ // vienen del service del más nuevo al más viejo
  { id: 'c', lat: -53.7925, lng: -67.6990, created_at: '2026-11-10T03:00:00', photo_url: 'https://x/c.jpg', description: 'Iba hacia la costanera' },
  { id: 'a', lat: -53.7990, lng: -67.6880, created_at: '2026-11-10T01:00:00', photo_url: null, description: 'Visto cerca de Margen Sur' },
  { id: 'b', lat: -53.7950, lng: -67.6930, created_at: '2026-11-10T02:00:00+00:00', photo_url: 'http://inseguro/b.jpg' },
];
const NOW = Date.parse('2026-11-10T03:30:00Z');

ok('recorrido: arranca donde se perdió y sigue en orden de hora', () => {
  const t = buildTrack(pinExacto, avist, NOW);
  assert.deepEqual(t.points.map(p => p.kind === 'lost' ? 'lost' : p.id), ['lost', 'a', 'b', 'c']);
  assert.deepEqual(t.points.slice(1).map(p => p.n), [1, 2, 3]);
});
ok('recorrido: solo el último está destacado', () => {
  const t = buildTrack(pinExacto, avist, NOW);
  assert.deepEqual(t.points.filter(p => p.isLast).map(p => p.id), ['c']);
  assert.equal(t.points.at(-1).timeLabel, 'hace 30 min');
});
ok('recorrido: foto solo https, nota automática vieja descartada', () => {
  const t = buildTrack(pinExacto, avist, NOW);
  const byId = Object.fromEntries(t.points.filter(p => p.id).map(p => [p.id, p]));
  assert.equal(byId.c.photo, 'https://x/c.jpg');
  assert.equal(byId.b.photo, null);
  assert.equal(byId.a.note, '');
  assert.equal(byId.c.note, 'Iba hacia la costanera');
});
ok('recorrido: sin ubicación exacta no inventa el punto de pérdida', () => {
  const t = buildTrack({ ...pinExacto, exactLocation: false }, avist, NOW);
  assert.equal(t.points[0].kind, 'sighting');
  assert.equal(t.points.length, 3);
});
ok('recorrido: sin avistamientos no dibuja nada', () => {
  assert.equal(buildTrack(pinExacto, [], NOW), null);
  assert.equal(buildTrack(null, avist, NOW), null);
  assert.equal(buildTrack(pinExacto, [{ id: 'x', lat: null, lng: 1 }], NOW), null);
});

// ── Modo rastreo: zona de búsqueda ──────────────────────────────────────────
ok('zona de búsqueda: 300 m al inicio, +300 m por hora, tope 3 km', () => {
  const t0 = Date.parse('2026-11-10T00:00:00Z');
  assert.equal(searchRadiusMeters(t0, t0), 300);
  assert.equal(searchRadiusMeters(t0, t0 + 30 * 60000), 450);
  assert.equal(searchRadiusMeters(t0, t0 + 3 * 3600000), 1200);
  assert.equal(searchRadiusMeters(t0, t0 + 9 * 3600000), 3000);
  assert.equal(searchRadiusMeters(t0, t0 + 72 * 3600000), 3000);
  assert.equal(searchRadiusMeters(undefined, t0), 300);
  assert.equal(searchRadiusMeters(t0 + 60000, t0), 300); // fecha futura (reloj corrido) no achica
});
ok('rastreo: la zona se centra en el último avistamiento', () => {
  const t = buildTrack(pinExacto, avist, NOW, { search: true });
  assert.equal(t.mode, 'tracking');
  assert.equal(t.searchArea.lat, -53.7925);
  assert.equal(t.searchArea.radiusM, 450);          // último avistamiento hace 30 min
  assert.equal(t.searchArea.radiusLabel, '450 m');
  assert.equal(t.searchArea.fromSighting, true);
});
ok('rastreo sin avistamientos: zona desde donde se perdió, por la hora del reporte', () => {
  const pin = { ...pinExacto, createdAt: '2026-11-10T01:30:00+00:00' };
  const t = buildTrack(pin, [], NOW, { search: true });
  assert.equal(t.points.length, 1);
  assert.equal(t.points[0].kind, 'lost');
  assert.equal(t.searchArea.lat, pinExacto.lat);
  assert.equal(t.searchArea.radiusM, 900);           // 2 h → 300 + 600
  assert.equal(t.searchArea.radiusLabel, '900 m');
  assert.equal(buildTrack(pin, [], Date.parse('2026-11-12T00:00:00Z'), { search: true }).searchArea.radiusLabel, '3 km');
  assert.equal(t.searchArea.fromSighting, false);
});
ok('rastreo sin avistamientos ni punto exacto: no hay nada que dibujar', () => {
  assert.equal(buildTrack({ ...pinExacto, exactLocation: false }, [], NOW, { search: true }), null);
});
ok('modo normal no agrega zona de búsqueda', () => {
  assert.equal(buildTrack(pinExacto, avist, NOW).searchArea, undefined);
  assert.equal(buildTrack(pinExacto, [], NOW), null);
});

console.log(`\n${n} casos OK`);
