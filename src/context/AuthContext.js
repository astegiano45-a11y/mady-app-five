import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { registerForPush, savePushToken, requestWebNotificationPermission } from '../services/proximityService';
import { getCurrentLocation, requestPermission } from '../services/LocationService';

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_IN_USE:        'Este correo ya está registrado.',
  NETWORK:             'Sin conexión. Intenta de nuevo.',
  UNKNOWN:             'Algo salió mal. Intenta de nuevo.',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Al autenticarse: registra para push + pide permisos de geolocalización
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      // Push notifications
      const pushToken = await registerForPush();
      if (pushToken) await savePushToken(pushToken);
      // Web notifications
      await requestWebNotificationPermission();
      // Geolocalización (para sistema de proximidad)
      await requestPermission();
    })();
  }, [currentUser]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.includes('Invalid') ? AUTH_ERRORS.INVALID_CREDENTIALS : AUTH_ERRORS.UNKNOWN;
      throw Object.assign(new Error(msg), { code: 'INVALID_CREDENTIALS' });
    }
    return data.user;
  };

  const register = async ({ name, email, password, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) {
      const msg = error.message.includes('already') ? AUTH_ERRORS.EMAIL_IN_USE : AUTH_ERRORS.UNKNOWN;
      throw Object.assign(new Error(msg), { code: 'EMAIL_IN_USE' });
    }
    return data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = async (fields) => {
    const { data, error } = await supabase.auth.updateUser({ data: fields });
    if (!error) setCurrentUser(data.user);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoading,
      isAuthenticated: !!currentUser,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
