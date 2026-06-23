// ─────────────────────────────────────────────────────────────────────────────
//  Mady Design System · Spacing & Radius v3
// ─────────────────────────────────────────────────────────────────────────────

export const S = {
  2:   2,
  4:   4,
  6:   6,
  8:   8,
  10:  10,
  12:  12,
  14:  14,
  16:  16,
  20:  20,
  24:  24,
  28:  28,
  32:  32,
  40:  40,
  48:  48,
  56:  56,
  64:  64,
  80:  80,
};

export const R = {
  xs:    8,
  sm:    12,
  md:    16,
  lg:    20,
  xl:    24,   // ← Border radius principal Mady
  '2xl': 32,
  full:  9999,
};

export const SH = {
  none: {},
  xs: {
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 12,
  },
  teal: {
    shadowColor: '#18C5C8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 10,
  },
  coral: {
    shadowColor: '#FF7048',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
};
