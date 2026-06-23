// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · Design System v2 — "Clean & Vibrant"
//  Blanco limpio + acentos vibrantes. Abandona crema/dorado aburrido.
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // ── Brand primario ──────────────────────────────────────────────────────────
  primary:       '#5B4FFF',   // índigo/violeta — identidad principal
  primaryLight:  '#EEF0FF',
  primaryMid:    '#8B80FF',
  primaryDark:   '#3D31E0',

  // ── Acentos funcionales ─────────────────────────────────────────────────────
  sos:           '#FF4757',   // rojo coral — alerta, SOS
  sosBg:         '#FFF0F1',
  sosLight:      '#FF8591',
  sosDark:       '#CC2233',

  teal:          '#00C9A7',   // verde-teal — éxito, encontrado
  tealBg:        '#E6FBF7',
  tealDark:      '#00A888',

  amber:         '#FFA502',   // ámbar — advertencia, pendiente
  amberBg:       '#FFF8EC',
  amberDark:     '#CC8200',

  community:     '#845EF7',   // violeta — comunidad/social
  communityBg:   '#F3EFFB',

  // ── Neutros ─────────────────────────────────────────────────────────────────
  black:         '#1C1C1E',   // iOS near-black
  gray900:       '#111827',
  gray800:       '#1F2937',
  gray700:       '#374151',
  gray600:       '#4B5563',
  gray500:       '#6B7280',
  gray400:       '#9CA3AF',
  gray300:       '#D1D5DB',
  gray200:       '#E5E7EB',
  gray100:       '#F3F4F6',
  gray50:        '#F9FAFB',
  white:         '#FFFFFF',

  // ── Aliases UI ──────────────────────────────────────────────────────────────
  bg:            '#FFFFFF',
  surface:       '#F9FAFB',
  surfaceCard:   '#FFFFFF',
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  placeholder:   '#9CA3AF',
  textPrimary:   '#1C1C1E',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  textBody:      '#374151',

  // ── Semánticos legacy (compatibilidad con screens viejas) ───────────────────
  gold:          '#F59E0B',
  goldLight:     '#FCD34D',
  goldDark:      '#D97706',
  goldPale:      '#FEF3C7',
  cream:         '#FFFFFF',
  creamDark:     '#F9FAFB',
  error:         '#EF4444',
  errorBg:       '#FEF2F2',
  success:       '#10B981',
  successBg:     '#ECFDF5',
  warning:       '#F59E0B',
  warningBg:     '#FFFBEB',
};

export const FONTS = {
  serif:    'Georgia',
  sans:     'System',

  thin:     '100',
  light:    '300',
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
  black:    '900',

  xs:    11,
  sm:    13,
  base:  15,
  md:    17,
  lg:    20,
  xl:    24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 42,
};


export const SPACING = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
  '3xl': 64,
};

export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl':32,
  full: 9999,
};

export const SHADOW = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  primary: {
    shadowColor: '#5B4FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 8,
  },
  sos: {
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  // legacy
  gold: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};
