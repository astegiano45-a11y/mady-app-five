// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · LocationService — expo-location wrapper
// ─────────────────────────────────────────────────────────────────────────────

import * as Location from 'expo-location';

export async function requestPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation() {
  const ok = await requestPermission();
  if (!ok) return null;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch { return null; }
}

export async function reverseGeocode(lat, lng) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!results.length) return 'Ubicación desconocida';
    const r = results[0];
    return [r.street, r.district, r.city].filter(Boolean).join(', ');
  } catch { return 'Ubicación desconocida'; }
}

// Calcular distancia en km entre dos puntos (fórmula Haversine)
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
