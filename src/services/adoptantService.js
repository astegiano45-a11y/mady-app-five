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
    const { data, error } = await supabase
      .from('adoption_matches')
      .upsert({
        adoptant_id: adoptantId,
        alerta_id: alertaId,
        adoptant_liked: liked,
      })
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
