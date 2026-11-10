// ─────────────────────────────────────────────────────────────────────────────
//  proximityService — Sistema de alertas por proximidad ("AirTag comunitario")
//  Nivel 1: guarda ubicación + token, notifica en tiempo real a usuarios cercanos
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { distanceKm, ZONE_COORDS } from '../utils/geo';

// Las coordenadas por zona y formatDistance viven en utils/geo (puro);
// se re-exportan acá para no romper los imports existentes.
export { ZONE_COORDS, formatDistance } from '../utils/geo';

// Radio (km) dentro del cual se notifica a un usuario sobre una alerta nueva
export const ALERT_RADIUS_KM = 3;

// Resuelve lat/lng de una alerta: usa las propias si existen, si no la zona
export function alertCoords(alerta) {
  if (typeof alerta.lat === 'number' && typeof alerta.lng === 'number') {
    return { lat: alerta.lat, lng: alerta.lng };
  }
  return ZONE_COORDS[alerta.zone] || ZONE_COORDS['Barrio Centro'];
}

// Guarda mi ubicación actual en mi perfil (para que otros calculen proximidad)
export async function updateMyLocation(lat, lng) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ last_lat: lat, last_lng: lng })
      .eq('id', user.id);
  } catch {}
}

// Guarda el token de notificaciones push (solo nativo; en web se ignora)
export async function savePushToken(token) {
  if (!token) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', user.id);
  } catch {}
}

// Pide permiso y devuelve el push token (nativo). En web devuelve null.
export async function registerForPush() {
  if (Platform.OS === 'web') return null;
  try {
    const Notifications = require('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    if (status !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

// Pide permiso de notificaciones del navegador (web)
export async function requestWebNotificationPermission() {
  if (Platform.OS !== 'web') return false;
  try {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

// Dispara una notificación del sistema operativo en el navegador
export function fireWebNotification({ title, body, icon }) {
  try {
    if (Platform.OS !== 'web') return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, { body, icon, tag: 'mady-alert' });
    setTimeout(() => { try { n.close(); } catch {} }, 8000);
  } catch {}
}

// Decide si una alerta nueva es relevante para mí según mi ubicación
// Devuelve { relevant, distanceKm }
export function evaluateProximity(alerta, myLat, myLng) {
  if (typeof myLat !== 'number' || typeof myLng !== 'number') {
    // Sin mi ubicación: la consideramos relevante igual (mejor avisar)
    return { relevant: true, distanceKm: null };
  }
  const { lat, lng } = alertCoords(alerta);
  const d = distanceKm(myLat, myLng, lat, lng);
  return { relevant: d <= ALERT_RADIUS_KM, distanceKm: d };
}
