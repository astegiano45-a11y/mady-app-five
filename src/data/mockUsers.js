// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · Mock Users — Semana 1
//  Usuarios precargados para testing de autenticación.
//  En producción esta capa es reemplazada por la API real.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_USERS = [
  {
    id:        'u-001',
    name:      'Sofía Ramírez',
    email:     'sofia@madyapp.com',
    password:  '123456',          // plain text sólo para mock
    phone:     '+52 55 1234 5678',
    city:      'Ciudad de México',
    avatar:    null,
    createdAt: '2025-01-01T10:00:00Z',
    pets:      ['p1', 'p2', 'p3'],
  },
  {
    id:        'u-002',
    name:      'Carlos Mendoza',
    email:     'carlos@test.com',
    password:  'abcdef',
    phone:     '+52 33 9876 5432',
    city:      'Guadalajara',
    avatar:    null,
    createdAt: '2025-01-05T12:00:00Z',
    pets:      [],
  },
  {
    id:        'u-003',
    name:      'Ana Torres',
    email:     'ana@test.com',
    password:  'pass123',
    phone:     '+52 81 5555 0000',
    city:      'Monterrey',
    avatar:    null,
    createdAt: '2025-01-08T09:30:00Z',
    pets:      [],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Busca un usuario por email (case-insensitive).
 * Devuelve el objeto usuario sin la contraseña, o null.
 */
export function findUserByEmail(users, email) {
  return users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  ) ?? null;
}

/**
 * Valida credenciales. Devuelve el usuario sin password si OK, o null.
 */
export function authenticateUser(users, email, password) {
  const user = findUserByEmail(users, email);
  if (!user || user.password !== password) return null;
  // Nunca exponer la contraseña fuera del mock store
  const { password: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Crea un nuevo usuario y lo añade a la lista.
 * Devuelve { ok, user?, error? }.
 */
export function registerUser(users, { name, email, password, phone, city }) {
  if (findUserByEmail(users, email)) {
    return { ok: false, error: 'Este correo ya está registrado.' };
  }
  const newUser = {
    id:        `u-${Date.now()}`,
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    password,                       // guardado en mock store
    phone:     phone?.trim() || '',
    city:      city?.trim()  || '',
    avatar:    null,
    createdAt: new Date().toISOString(),
    pets:      [],
  };
  const { password: _, ...safeUser } = newUser;
  return { ok: true, user: safeUser, rawUser: newUser };
}
