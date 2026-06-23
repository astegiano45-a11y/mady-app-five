import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOW, SPACING } from '../theme';

export default function ScreenHeader({ title, subtitle, onBack, right, style }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }, SHADOW.sm, style]}>
      <View style={styles.row}>
        {/* Back button */}
        <View style={styles.side}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title block */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Right slot */}
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          {right || null}
        </View>
      </View>

      {/* Gold accent line */}
      <View style={styles.accentLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.cream,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.xs,
  },
  side:   { width: 52, minHeight: 36, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.black,
    fontFamily: 'serif',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  backBtn:  { padding: 4 },
  backIcon: { fontSize: 32, color: COLORS.gold, lineHeight: 36 },
  accentLine: {
    height: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.45,
    borderRadius: 1,
    marginTop: 4,
  },
});
