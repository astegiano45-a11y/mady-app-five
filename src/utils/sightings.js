// ─────────────────────────────────────────────────────────────────────────────
//  sightings utils — fechas y texto del lugar de un avistamiento.
//  Puro (sin React Native): se prueba con scripts/check-sightings-utils.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { distanceKm, formatDistance, nearestZone } from './geo';

// Supabase devuelve las columnas "timestamp" (sin zona) como
// "2026-11-10T01:55:19.035293", sin "Z". new Date() las lee como hora LOCAL,
// así que en Argentina (UTC−3) quedaban 3 horas corridas. La base las guarda
// en UTC (now() del servidor), así que si no traen zona, son UTC.
// Las columnas "timestamptz" ya traen "+00:00" y se respetan tal cual.
const HAS_TZ = /(Z|[+-]\d{2}:?\d{2})$/i;

export function parseDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  return new Date(HAS_TZ.test(s) ? s : `${s}Z`);
}

// "recién" / "hace 5 min" / "hace 2 h" / "hace 3 días"
export function timeAgo(value, now = Date.now()) {
  const d = parseDbDate(value);
  if (!d || Number.isNaN(d.getTime())) return '';
  const diff = Math.floor((now - d.getTime()) / 60000);
  if (diff < 1) return 'recién';
  if (diff < 60) return `hace ${diff} min`;
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
  const days = Math.floor(diff / 1440);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

// Texto que generaba la app vieja en description ("Visto cerca de <zona de
// la alerta>"). No describe el lugar real, así que no se muestra como nota.
const AUTO_DESCRIPTION = /^Visto cerca de /;

export function sightingNote(sighting) {
  const d = (sighting?.description || '').trim();
  return d && !AUTO_DESCRIPTION.test(d) ? d : '';
}

// "Cerca de Chacra II · a 1,2 km de donde se perdió"
// lostPoint: { lat, lng } de la alerta (opcional).
export function sightingPlaceLabel(sighting, lostPoint) {
  const { lat, lng } = sighting || {};
  const zone = nearestZone(lat, lng);
  if (!zone) return 'Ubicación no disponible';
  let label = `Cerca de ${zone}`;
  if (lostPoint && typeof lostPoint.lat === 'number' && typeof lostPoint.lng === 'number') {
    const km = distanceKm(lostPoint.lat, lostPoint.lng, lat, lng);
    label += km < 0.05
      ? ' · donde se perdió'
      : ` · ${formatDistance(km)} de donde se perdió`;
  }
  return label;
}
