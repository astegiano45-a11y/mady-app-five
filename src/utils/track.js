// ─────────────────────────────────────────────────────────────────────────────
//  track — recorrido de una mascota perdida (etapa 3, docs/plan-avistamientos.md)
//
//  Arma los puntos que dibuja el mapa: el lugar donde se perdió (si se conoce
//  con precisión) y los avistamientos ordenados del más viejo al más nuevo.
//  Puro: se prueba con scripts/check-sightings-utils.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { parseDbDate, timeAgo, sightingPlaceLabel, sightingNote } from './sightings';

// pin: alerta del mapa ({ lat, lng, exactLocation, name }).
// sightings: filas de la tabla sightings (cualquier orden).
// Devuelve null si no hay nada que dibujar.
export function buildTrack(pin, sightings = [], now = Date.now()) {
  if (!pin) return null;
  const lostPoint = pin.exactLocation && typeof pin.lat === 'number' && typeof pin.lng === 'number'
    ? { lat: pin.lat, lng: pin.lng }
    : null;

  const valid = sightings
    .filter((s) => typeof s?.lat === 'number' && typeof s?.lng === 'number')
    .map((s) => ({ s, t: parseDbDate(s.created_at)?.getTime() ?? 0 }))
    .sort((a, b) => a.t - b.t); // más viejo → más nuevo

  if (valid.length === 0) return null;

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

  return { petName: pin.name || '', points };
}
