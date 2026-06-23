// ─────────────────────────────────────────────────────────────────────────────
//  GlassCard v2 — Glassmorphism premium
//  Web: backdropFilter blur real + gradient border
//  Native: semi-opaco con borde blanco suave
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { R, SH } from '../theme/spacing';
import { C }     from '../theme/colors';

export default function GlassCard({
  children,
  style,
  dark    = false,
  padding = 20,
  radius  = R.xl,
  shadow  = 'md',
  tint,           // optional: 'teal' | 'coral' — colored glass
}) {
  const isWeb = Platform.OS === 'web';

  // ── Background por variante ─────────────────────────────────────────────────
  let bg, border, gradientOverlay;

  if (tint === 'teal') {
    bg            = isWeb ? 'rgba(24,197,200,0.12)' : 'rgba(24,197,200,0.14)';
    border        = 'rgba(24,197,200,0.30)';
    gradientOverlay = null;
  } else if (tint === 'coral') {
    bg            = isWeb ? 'rgba(255,112,72,0.10)' : 'rgba(255,112,72,0.12)';
    border        = 'rgba(255,112,72,0.28)';
    gradientOverlay = null;
  } else if (dark) {
    bg            = isWeb ? 'rgba(18,28,44,0.78)' : 'rgba(18,28,44,0.82)';
    border        = 'rgba(255,255,255,0.12)';
  } else {
    bg            = isWeb ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.88)';
    border        = 'rgba(255,255,255,0.70)';
  }

  // ── Estilos web-only ────────────────────────────────────────────────────────
  const webStyle = isWeb ? {
    backdropFilter:       'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    background:           bg,
    borderColor:          border,
  } : {};

  return (
    <View
      style={[
        styles.card,
        {
          padding,
          borderRadius:    radius,
          backgroundColor: bg,
          borderColor:     border,
        },
        SH[shadow] || SH.md,
        webStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
});
