// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · LocationService — expo-location wrapper
// ─────────────────────────────────────────────────────────────────────────────

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { zoneLabel } from '../utils/geo';

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

// Nombre legible de un punto, para el encabezado del mapa.
// En la web expo-location NO tiene geocoding inverso: reverseGeocodeAsync
// devuelve siempre [] (se quitó la API de Google en el SDK 49), y por eso el
// mapa decía "Ubicación desconocida". Ahí se usa la zona de Río Grande más
// cercana, calculada en el teléfono, sin mandar la ubicación a nadie.
// En iOS/Android se intenta primero el geocoding nativo (calle, barrio).
export async function reverseGeocode(lat, lng) {
  if (Platform.OS !== 'web') {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const r = results?.[0];
      const name = r ? [r.street, r.district, r.city].filter(Boolean).join(', ') : '';
      if (name) return name;
    } catch {}
  }
  return zoneLabel(lat, lng) || 'Río Grande · TDF';
}

// Seguimiento en vivo (modo rastreo). onUpdate({ lat, lng, accuracy }) cada vez
// que la persona se mueve ~5 m. Devuelve una función para dejar de seguir.
// Si no hay permiso, llama a onError('permiso'); si falla el GPS, onError('gps').
export function watchLocation(onUpdate, onError) {
  // Web: API del navegador directa. Location.watchPositionAsync de expo-location
  // 17 en la web pisa el id de la suscripción con el del navegador, así que
  // las actualizaciones (salvo, a veces, la primera) se descartan y el punto
  // nunca se movía. Además su remove() no llama a clearWatch: el GPS seguía
  // prendido después de salir del rastreo.
  if (Platform.OS === 'web') {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
    if (!geo) { onError?.('gps'); return () => {}; }
    const id = geo.watchPosition(
      (p) => onUpdate({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null }),
      (e) => onError?.(e && e.code === 1 ? 'permiso' : 'gps'), // 1 = PERMISSION_DENIED
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => geo.clearWatch(id);
  }

  let sub = null;
  let stopped = false;
  (async () => {
    const ok = await requestPermission().catch(() => false);
    if (!ok) { onError?.('permiso'); return; }
    try {
      const s = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
        (loc) => onUpdate({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
        }),
      );
      if (stopped) s.remove(); else sub = s;
    } catch {
      onError?.('gps');
    }
  })();
  return () => { stopped = true; sub?.remove(); sub = null; };
}

// Distancia Haversine: vive en utils/geo (puro, testeable con Node).
// Se re-exporta acá para no romper los imports existentes.
export { distanceKm } from '../utils/geo';
