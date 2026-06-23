import { supabase } from '../lib/supabase';

export async function getAlertasNearby(limit = 10) {
  const { data, error } = await supabase
    .from('alertas')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function crearAlerta(alerta) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('alertas')
    .insert({ ...alerta, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAlertasMias() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('alertas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function resolverAlerta(id) {
  const { error } = await supabase
    .from('alertas')
    .update({ status: 'resolved' })
    .eq('id', id);

  if (error) throw error;
}

export function suscribirAlertas(callback) {
  return supabase
    .channel('alertas-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, callback)
    .subscribe();
}
