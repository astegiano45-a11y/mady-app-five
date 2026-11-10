// ─────────────────────────────────────────────────────────────────────────────
//  photoUploadService — sube una foto elegida con expo-image-picker al bucket
//  "mascotas" de Supabase Storage y devuelve su URL pública.
//  Antes vivía dentro de ReportarScreen; ahora la usan también los
//  avistamientos (etapa 2 de docs/plan-avistamientos.md).
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const BUCKET = 'mascotas';

// photo: { uri, base64? } tal como lo devuelve ImagePicker (assets[0]).
// path: ruta dentro del bucket, ej. "reportes/1794275634653.jpg".
export async function uploadPhoto(path, { uri, base64 }) {
  if (Platform.OS === 'web' || base64) {
    // En web la uri es un data URL ("data:image/jpeg;base64,...")
    const base64Data = base64 || uri.split(',')[1];
    const byteChars  = atob(base64Data);
    const byteNums   = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } else {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true });
    if (error) throw error;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
