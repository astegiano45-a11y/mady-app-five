// sightingsService — Guardar avistamientos de mascotas perdidas
import { supabase } from '../lib/supabase';

export async function createSighting(alertaId, lat, lng, description = '') {
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
        description,
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
