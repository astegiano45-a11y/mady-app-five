import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

/**
 * variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * size:    'sm' | 'md' | 'lg'
 */
export default function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  icon     = null,
  style,
  labelStyle,
}) {
  const isDisabled = disabled || loading;

  const container = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    isDisabled && styles.labelDisabled,
    labelStyle,
  ];

  return (
    <TouchableOpacity
      style={container}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.cream : COLORS.gold}
          size="small"
        />
      ) : (
        <View style={styles.row}>
          {icon && <Text style={[styles.icon, styles[`label_${variant}`]]}>{icon}</Text>}
          <Text style={textStyle}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // ── Variants ────────────────────────────────────────────────────────────────
  variant_primary: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldDark,
    ...SHADOW.gold,
  },
  variant_secondary: {
    backgroundColor: COLORS.cream,
    borderColor: COLORS.creamDark,
    ...SHADOW.sm,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.gold,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: COLORS.error,
    borderColor: '#A93226',
    ...SHADOW.sm,
  },

  // ── Labels ──────────────────────────────────────────────────────────────────
  label: {
    fontWeight: FONTS.semibold,
    letterSpacing: 0.5,
  },
  label_primary:   { color: COLORS.cream },
  label_secondary: { color: COLORS.black },
  label_outline:   { color: COLORS.gold },
  label_ghost:     { color: COLORS.gold },
  label_danger:    { color: COLORS.white },

  // ── Sizes ───────────────────────────────────────────────────────────────────
  size_sm: { paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.md },
  size_md: { paddingVertical: SPACING.sm + 4, paddingHorizontal: SPACING.lg },
  size_lg: { paddingVertical: SPACING.md,     paddingHorizontal: SPACING.xl },

  labelSize_sm: { fontSize: FONTS.sm },
  labelSize_md: { fontSize: FONTS.base },
  labelSize_lg: { fontSize: FONTS.md },

  // ── States ──────────────────────────────────────────────────────────────────
  disabled:      { opacity: 0.45 },
  labelDisabled: {},

  icon: { fontSize: 16 },
});
