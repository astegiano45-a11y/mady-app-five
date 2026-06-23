// ─────────────────────────────────────────────────────────────────────────────
//  Mady Design System · Colors v4
//  Paleta reducida: Turquesa + Coral + Blanco + Grises neutros
//  Verde → estados positivos  |  Rojo → alertas críticas
//  Sin: violeta, azul, rosa, amarillo
// ─────────────────────────────────────────────────────────────────────────────

export const palette = {
  // ── Brand principal ────────────────────────────────────────────────────────
  teal:        '#18C5C8',
  tealDark:    '#0FA8AB',
  tealDeep:    '#089A97',
  tealLight:   '#E4F8F8',
  tealMid:     '#9EE8E9',
  tealGlass:   'rgba(24,197,200,0.12)',

  // ── Acento ─────────────────────────────────────────────────────────────────
  coral:       '#FF7048',
  coralDark:   '#E85A32',
  coralDeep:   '#C94420',
  coralLight:  '#FFF0EB',
  coralMid:    '#FFAD96',
  coralGlass:  'rgba(255,112,72,0.10)',

  // ── Semánticos (solo donde tienen significado real) ────────────────────────
  lost:        '#EF4444',   // rojo — solo alertas críticas (mascota perdida)
  lostBg:      '#FEF2F2',
  found:       '#16A34A',   // verde — solo estados positivos (encontrado, en casa)
  foundBg:     '#F0FDF4',

  // adopción → usa teal (no violeta)
  adoption:    '#18C5C8',
  adoptionBg:  '#E4F8F8',

  // ── Neutros ────────────────────────────────────────────────────────────────
  ink:         '#1A2433',
  inkMid:      '#3D4F63',
  inkLight:    '#6B7A8D',
  inkMuted:    '#A0AABA',

  cloud:       '#F5F7FA',
  cloudMid:    '#EBF0F6',
  border:      '#E2E8F0',
  borderLight: '#F1F5F9',

  white:       '#FFFFFF',
  black:       '#0A0F1A',

  // ── Glass ──────────────────────────────────────────────────────────────────
  glassBg:          'rgba(255,255,255,0.80)',
  glassBorder:      'rgba(255,255,255,0.60)',
  glassDark:        'rgba(18,28,44,0.75)',
  glassDarkBorder:  'rgba(255,255,255,0.12)',
};

export const C = palette;
