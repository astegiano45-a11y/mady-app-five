import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';

export default function GoldDivider({ label, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : (
        <View style={styles.diamond} />
      )}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  line:    { flex: 1, height: 1, backgroundColor: COLORS.gold, opacity: 0.35 },
  diamond: {
    width: 7, height: 7,
    backgroundColor: COLORS.gold,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: SPACING.sm,
    opacity: 0.7,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
