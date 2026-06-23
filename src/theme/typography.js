// ─────────────────────────────────────────────────────────────────────────────
//  Mady Design System · Typography v3
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

const base = Platform.select({ ios: 'System', android: 'Roboto', default: 'Inter, -apple-system, sans-serif' });

export const T = {
  // Familias
  sans:   base,
  serif:  Platform.select({ ios: 'Georgia', android: 'serif', default: '"Playfair Display", Georgia, serif' }),

  // Pesos
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
  black:    '900',

  // Tamaños (escala armónica 1.25)
  xs:    11,
  sm:    13,
  base:  15,
  md:    17,
  lg:    20,
  xl:    24,
  '2xl': 30,
  '3xl': 38,

  // Alturas de línea
  tight:   1.15,
  normal:  1.5,
  relaxed: 1.75,

  // Tracking
  tight_ls:    -0.3,
  normal_ls:    0,
  wide_ls:      0.5,
  wider_ls:     1,
  widest_ls:    2,
};

// Text styles reutilizables
export const TS = {
  h1: { fontFamily: T.serif,  fontSize: T['3xl'], fontWeight: T.black,   lineHeight: T['3xl'] * T.tight,  letterSpacing: T.tight_ls,  color: '#1A2433' },
  h2: { fontFamily: T.serif,  fontSize: T['2xl'], fontWeight: T.heavy,   lineHeight: T['2xl'] * T.tight,  letterSpacing: T.tight_ls,  color: '#1A2433' },
  h3: { fontFamily: T.sans,   fontSize: T.xl,     fontWeight: T.heavy,   lineHeight: T.xl * T.normal,     letterSpacing: T.tight_ls,  color: '#1A2433' },
  h4: { fontFamily: T.sans,   fontSize: T.lg,     fontWeight: T.bold,    lineHeight: T.lg * T.normal,     color: '#1A2433' },
  h5: { fontFamily: T.sans,   fontSize: T.md,     fontWeight: T.bold,    lineHeight: T.md * T.normal,     color: '#1A2433' },

  bodyLg: { fontFamily: T.sans, fontSize: T.md,   fontWeight: T.regular, lineHeight: T.md * T.relaxed,    color: '#3D4F63' },
  body:   { fontFamily: T.sans, fontSize: T.base, fontWeight: T.regular, lineHeight: T.base * T.relaxed,  color: '#3D4F63' },
  bodySm: { fontFamily: T.sans, fontSize: T.sm,   fontWeight: T.regular, lineHeight: T.sm * T.relaxed,    color: '#6B7A8D' },

  label:  { fontFamily: T.sans, fontSize: T.sm,   fontWeight: T.semibold,letterSpacing: T.wide_ls,        color: '#3D4F63' },
  caption:{ fontFamily: T.sans, fontSize: T.xs,   fontWeight: T.medium,  letterSpacing: T.wider_ls,       color: '#A0AABA' },
  overline:{ fontFamily: T.sans,fontSize: T.xs,   fontWeight: T.heavy,   letterSpacing: T.widest_ls,      textTransform: 'uppercase', color: '#A0AABA' },
};
