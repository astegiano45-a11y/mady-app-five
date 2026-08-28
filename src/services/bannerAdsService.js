import { supabase } from '../lib/supabase';

// Banners publicitarios del Home. Se cargan a mano desde el dashboard de
// Supabase (tabla banner_ads). La policy de RLS ya deja pasar sólo los
// activos, pero filtramos igual acá por claridad y para ordenar por `orden`.
export async function getBannerAds() {
  try {
    const { data, error } = await supabase
      .from('banner_ads')
      .select('id, imagen_url, link_url, orden')
      .eq('activo', true)
      .order('orden', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('getBannerAds error:', err);
    return [];
  }
}
