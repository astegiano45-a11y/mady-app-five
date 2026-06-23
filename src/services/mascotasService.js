import { supabase } from '../lib/supabase';

export async function getMisMascotas() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('mascotas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function crearMascota(mascota) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('mascotas')
    .insert({ ...mascota, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function eliminarMascota(id) {
  const { error } = await supabase.from('mascotas').delete().eq('id', id);
  if (error) throw error;
}

export async function actualizarMascota(id, fields) {
  const { data, error } = await supabase
    .from('mascotas')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function subirFotoMascota(mascotaId, fileUri, fileName) {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const path = `${mascotaId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('mascotas')
    .upload(path, blob, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('mascotas').getPublicUrl(path);
  return data.publicUrl;
}
