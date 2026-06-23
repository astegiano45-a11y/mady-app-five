// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · Supabase client
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://pjdkllususshewxxyzwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable__uS-__PaV6q6wMLkl11bvQ_7ElTzvqw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
