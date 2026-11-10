// ─────────────────────────────────────────────────────────────────────────────
//  geo — utilidades geográficas puras (sin React Native ni Supabase), para
//  poder usarlas desde cualquier pantalla y probarlas con Node
//  (scripts/check-sightings-utils.mjs).
// ─────────────────────────────────────────────────────────────────────────────

// Centro aproximado de cada zona de Río Grande
export const ZONE_COORDS = {
  'Barrio Centro':  { lat: -53.7873, lng: -67.7100 },
  'Margen Sur':     { lat: -53.8050, lng: -67.6950 },
  'Chacra XI':      { lat: -53.7750, lng: -67.7300 },
  'Villa del Mar':  { lat: -53.7650, lng: -67.6800 },
  'Chacra II':      { lat: -53.7920, lng: -67.7250 },
  'Chacra III':     { lat: -53.7830, lng: -67.7400 },
  'Barrio IPVU':    { lat: -53.7700, lng: -67.7150 },
  'Zona Norte':     { lat: -53.7600, lng: -67.7050 },
};

// Distancia en km entre dos puntos (fórmula Haversine)
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Zona (de ZONE_COORDS) cuyo centro está más cerca del punto
export function nearestZone(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  let best = null;
  let bestD = Infinity;
  for (const [name, c] of Object.entries(ZONE_COORDS)) {
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

// "a 350 m" / "a 1,2 km"
export function formatDistance(km) {
  if (km == null) return 'cerca tuyo';
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  return `a ${km.toFixed(1).replace('.', ',')} km`;
}
