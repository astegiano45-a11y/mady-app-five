// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · LocationService — expo-location wrapper
// ─────────────────────────────────────────────────────────────────────────────

import * as Location from 'expo-location';

export async function requestPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// highAccuracy: GPS preciso (avistamientos, donde importa el punto exacto).
// Por defecto Balanced (~100 m), que alcanza para "cerca tuyo" y gasta menos batería.
export async function getCurrentLocation({ highAccuracy = false } = {}) {
  const ok = await requestPermission();
  if (!ok) return null;
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
    });
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

// Distancia Haversine: vive en utils/geo (puro, testeable con Node).
// Se re-exporta acá para no romper los imports existentes.
export { distanceKm } from '../utils/geo';
