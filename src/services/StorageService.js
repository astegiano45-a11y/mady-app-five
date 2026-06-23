// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · StorageService — AsyncStorage wrapper tipado
//  Persistencia local: usuario activo, mascotas, reportes
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER:    '@mady:user',
  PETS:    '@mady:pets',
  REPORTS: '@mady:reports',
  PREFS:   '@mady:prefs',
};

// ── Genéricos ─────────────────────────────────────────────────────────────────
async function get(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function set(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

async function remove(key) {
  try { await AsyncStorage.removeItem(key); return true; }
  catch { return false; }
}

// ── Usuario ───────────────────────────────────────────────────────────────────
export const UserStorage = {
  get:    () => get(KEYS.USER),
  set:    (u) => set(KEYS.USER, u),
  clear:  () => remove(KEYS.USER),
};

// ── Mascotas ──────────────────────────────────────────────────────────────────
export const PetsStorage = {
  getAll: async () => (await get(KEYS.PETS)) || [],

  add: async (pet) => {
    const list = (await get(KEYS.PETS)) || [];
    const next = [...list, { ...pet, id: `pet-${Date.now()}`, createdAt: new Date().toISOString() }];
    await set(KEYS.PETS, next);
    return next;
  },

  update: async (id, fields) => {
    const list = (await get(KEYS.PETS)) || [];
    const next = list.map(p => p.id === id ? { ...p, ...fields } : p);
    await set(KEYS.PETS, next);
    return next;
  },

  remove: async (id) => {
    const list = (await get(KEYS.PETS)) || [];
    const next = list.filter(p => p.id !== id);
    await set(KEYS.PETS, next);
    return next;
  },
};

// ── Reportes ──────────────────────────────────────────────────────────────────
export const ReportsStorage = {
  getAll: async () => (await get(KEYS.REPORTS)) || [],

  add: async (report) => {
    const list = (await get(KEYS.REPORTS)) || [];
    const next = [
      { ...report, id: `rep-${Date.now()}`, createdAt: new Date().toISOString(), active: true },
      ...list,
    ];
    await set(KEYS.REPORTS, next);
    return next;
  },

  resolve: async (id) => {
    const list = (await get(KEYS.REPORTS)) || [];
    const next = list.map(r => r.id === id ? { ...r, active: false, resolvedAt: new Date().toISOString() } : r);
    await set(KEYS.REPORTS, next);
    return next;
  },
};

// ── Preferencias ──────────────────────────────────────────────────────────────
export const PrefsStorage = {
  get:    () => get(KEYS.PREFS),
  set:    (p) => set(KEYS.PREFS, p),
  update: async (fields) => {
    const current = (await get(KEYS.PREFS)) || {};
    return set(KEYS.PREFS, { ...current, ...fields });
  },
};
