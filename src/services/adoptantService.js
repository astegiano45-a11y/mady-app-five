import { supabase } from '../lib/supabase';

export async function getAdoptantProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('adoptant_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('getAdoptantProfile error:', error);
    }

    console.log('✓ getAdoptantProfile result:', { userId, data, hasError: !!error });
    return data || null;
  } catch (err) {
    console.warn('getAdoptantProfile catch:', err);
    return null;
  }
}

export async function createAdoptantProfile(userId, profile) {
  try {
    const { data, error } = await supabase
      .from('adoptant_profiles')
      .insert({
        user_id: userId,
        dog_size: profile.dogSize || 'any',
        preferred_breeds: profile.preferredBreeds || [],
        experience_level: profile.experienceLevel,
        space_type: profile.spaceType,
        time_availability: profile.timeAvailability,
        lives_with: profile.livesWith || [],
        questions_answers: profile.questionsAnswers || {},
      })
      .select()
      .single();
    return data;
  } catch (err) {
    console.warn('createAdoptantProfile error:', err);
    throw err;
  }
}

export async function updateAdoptantProfile(userId, profile) {
  try {
    const { data, error } = await supabase
      .from('adoptant_profiles')
      .update({
        dog_size: profile.dogSize || 'any',
        preferred_breeds: profile.preferredBreeds || [],
        experience_level: profile.experienceLevel,
        space_type: profile.spaceType,
        time_availability: profile.timeAvailability,
        lives_with: profile.livesWith || [],
        questions_answers: profile.questionsAnswers || {},
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    return data;
  } catch (err) {
    console.warn('updateAdoptantProfile error:', err);
    throw err;
  }
}

export async function likeAdoption(adoptantId, alertaId, liked = true) {
  try {
    // onConflict explícito: sin esto, upsert() resuelve conflictos por la
    // primary key (id, que siempre es nueva) y cada "Me gusta"/"No me
    // interesa" insertaba una fila nueva en vez de actualizar la solicitud
    // existente para ese par adoptante/mascota. Requiere la unique
    // constraint sobre (adoptant_id, alerta_id) — ver SQL de setup.
    const { data, error } = await supabase
      .from('adoption_matches')
      .upsert({
        adoptant_id: adoptantId,
        alerta_id: alertaId,
        adoptant_liked: liked,
      }, { onConflict: 'adoptant_id,alerta_id' })
      .select()
      .single();
    return data;
  } catch (err) {
    console.warn('likeAdoption error:', err);
    throw err;
  }
}

export async function checkMatch(adoptantId, alertaId) {
  try {
    const { data, error } = await supabase
      .from('adoption_matches')
      .select('*')
      .eq('adoptant_id', adoptantId)
      .eq('alerta_id', alertaId)
      .single();
    return data || null;
  } catch {
    return null;
  }
}

export async function createAppointment(adoptantId, alertaId, scheduledTime, location, notes = '') {
  try {
    const { data, error } = await supabase
      .from('adoption_appointments')
      .insert({
        adoptant_id: adoptantId,
        alerta_id: alertaId,
        scheduled_time: scheduledTime,
        location,
        notes,
      })
      .select()
      .single();
    return data;
  } catch (err) {
    console.warn('createAppointment error:', err);
    throw err;
  }
}

export async function getUserAppointments(userId) {
  try {
    const { data, error } = await supabase
      .from('adoption_appointments')
      .select('*, alertas(*)')
      .eq('adoptant_id', userId)
      .order('scheduled_time', { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

export async function getAdoptionMatches(alertaId) {
  try {
    const { data, error } = await supabase
      .from('adoption_matches')
      .select('*, adoptant_profiles(*)')
      .eq('alerta_id', alertaId)
      .eq('owner_liked', true);
    return data || [];
  } catch {
    return [];
  }
}

// Solicitudes de adopción pendientes sobre MIS alertas — usa la función
// get_pending_adoption_requests(), que corre como SECURITY DEFINER y solo
// devuelve filas de alertas donde auth.uid() es el dueño. No hace falta un
// select amplio sobre adoption_matches/adoptant_profiles desde el cliente.
export async function getPendingAdoptionRequests() {
  try {
    const { data, error } = await supabase.rpc('get_pending_adoption_requests');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('getPendingAdoptionRequests error:', err);
    return [];
  }
}

// Aprobar (approve=true) o rechazar (approve=false) una solicitud. La RPC
// verifica del lado del servidor que quien llama sea el dueño de la alerta
// relacionada antes de tocar owner_liked.
export async function respondAdoptionMatch(matchId, approve) {
  const { error } = await supabase.rpc('respond_adoption_match', {
    match_id: matchId,
    approve,
  });
  if (error) throw error;
}
