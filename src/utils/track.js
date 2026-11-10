// ─────────────────────────────────────────────────────────────────────────────
//  track — recorrido de una mascota perdida (etapa 3, docs/plan-avistamientos.md)
//  y zona de búsqueda del modo rastreo.
//
//  Arma los puntos que dibuja el mapa: el lugar donde se perdió (si se conoce
//  con precisión) y los avistamientos ordenados del más viejo al más nuevo.
//  Puro: se prueba con scripts/check-sightings-utils.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { parseDbDate, timeAgo, sightingPlaceLabel, sightingNote } from './sightings';
import { formatDistance } from './geo';

// Zona de búsqueda: arranca en 300 m desde el último avistamiento (o desde
// donde se perdió) y suma 300 m por hora, hasta 3 km.
export const SEARCH_BASE_M     = 300;
export const SEARCH_GROWTH_M_H = 300;
export const SEARCH_MAX_M      = 3000;

export function searchRadiusMeters(sinceMs, now = Date.now()) {
  if (typeof sinceMs !== 'number' || Number.isNaN(sinceMs)) return SEARCH_BASE_M;
  const hours = Math.max(0, (now - sinceMs) / 3600000);
  return Math.min(SEARCH_MAX_M, Math.round(SEARCH_BASE_M + SEARCH_GROWTH_M_H * hours));
}

// pin: alerta del mapa ({ lat, lng, exactLocation, name, createdAt }).
// sightings: filas de la tabla sightings (cualquier orden).
// opts.search: modo rastreo → agrega la zona de búsqueda, y dibuja aunque
//   todavía no haya avistamientos (desde el punto donde se perdió).
// Devuelve null si no hay nada que dibujar.
export function buildTrack(pin, sightings = [], now = Date.now(), opts = {}) {
  if (!pin) return null;
  const lostPoint = pin.exactLocation && typeof pin.lat === 'number' && typeof pin.lng === 'number'
    ? { lat: pin.lat, lng: pin.lng }
    : null;

  const valid = sightings
    .filter((s) => typeof s?.lat === 'number' && typeof s?.lng === 'number')
    .map((s) => ({ s, t: parseDbDate(s.created_at)?.getTime() ?? 0 }))
    .sort((a, b) => a.t - b.t); // más viejo → más nuevo

  if (valid.length === 0 && !(opts.search && lostPoint)) return null;

  const points = [];
  if (lostPoint) {
    points.push({ kind: 'lost', lat: lostPoint.lat, lng: lostPoint.lng, label: `Acá se perdió ${pin.name || ''}`.trim() });
  }
  valid.forEach(({ s }, i) => {
    const isLast = i === valid.length - 1;
    points.push({
      kind: 'sighting',
      id: s.id,
      n: i + 1,
      isLast,
      lat: s.lat,
      lng: s.lng,
      timeLabel: timeAgo(s.created_at, now),
      placeLabel: sightingPlaceLabel(s, lostPoint),
      note: sightingNote(s),
      photo: typeof s.photo_url === 'string' && s.photo_url.startsWith('https') ? s.photo_url : null,
    });
  });

  const track = { petName: pin.name || '', points, mode: opts.search ? 'tracking' : 'normal' };

  if (opts.search) {
    // Centro: el último avistamiento; si no hay, donde se perdió
    const last = valid.length ? valid[valid.length - 1] : null;
    const center = last ? { lat: last.s.lat, lng: last.s.lng } : lostPoint;
    const sinceMs = last ? last.t : (pin.createdAt ? parseDbDate(pin.createdAt)?.getTime() : undefined);
    const radiusM = searchRadiusMeters(sinceMs, now);
    track.searchArea = {
      lat: center.lat,
      lng: center.lng,
      radiusM,
      // "300 m" / "1,2 km" / "3 km"
      radiusLabel: formatDistance(radiusM / 1000).replace(/^a /, '').replace(',0 km', ' km'),
      fromSighting: !!last,
      maxed: radiusM >= SEARCH_MAX_M,
    };
  }

  return track;
}
