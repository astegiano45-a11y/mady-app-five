// sightingsService — Guardar avistamientos de mascotas perdidas
import { supabase } from '../lib/supabase';
import { uploadPhoto } from './photoUploadService';

// Sube la foto del avistamiento y devuelve su URL pública.
// Ruta: mascotas/avistamientos/<alerta_id>/<timestamp>.jpg
export function uploadSightingPhoto(alertaId, photo) {
  return uploadPhoto(`avistamientos/${alertaId}/${Date.now()}.jpg`, photo);
}

// lat/lng: ubicación tomada en el momento de la foto.
// description: nota opcional escrita por quien la vio.
export async function createSighting({ alertaId, lat, lng, photoUrl = null, description = null }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('sightings')
      .insert({
        alerta_id: alertaId,
        user_id: user.id,
        lat,
        lng,
        photo_url: photoUrl,
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('createSighting error:', err);
    throw err;
  }
}

// Tiempo real: avisa cuando se carga un avistamiento nuevo de esa alerta.
// Devuelve el canal (cerrarlo con supabase.removeChannel).
export function suscribirAvistamientos(alertaId, callback, channelName = `avistamientos-${alertaId}`) {
  return supabase
    .channel(channelName)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sightings', filter: `alerta_id=eq.${alertaId}` },
      callback)
    .subscribe();
}

export async function getSightingsForAlerta(alertaId) {
  try {
    const { data, error } = await supabase
      .from('sightings')
      .select('*')
      .eq('alerta_id', alertaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}
