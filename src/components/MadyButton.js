// ─────────────────────────────────────────────────────────────────────────────
//  MadyButton — Botón premium con microanimación de escala
//  Variantes: primary (coral), secondary (teal), ghost, danger
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef } from 'react';
import { Pressable, Animated, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme/colors';
import { R, SH } from '../theme/spacing';
import { T } from '../theme/typography';

const VARIANTS = {
  primary:   { gradient: [C.coral, C.coralDark],  text: C.white, shadow: SH.coral },
  secondary: { gradient: [C.teal,  C.tealDark],   text: C.white, shadow: SH.teal  },
  ghost:     { gradient: null, bg: 'transparent',  text: C.teal,  border: C.teal, shadow: SH.none },
  danger:    { gradient: [C.lost, '#CC2222'],       text: C.white, shadow: SH.coral },
  white:     { gradient: null, bg: C.white,         text: C.teal,  shadow: SH.md },
};

export default function MadyButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const v = VARIANTS[variant] || VARIANTS.primary;

  const HEIGHT = { sm: 44, md: 54, lg: 62 }[size] || 54;
  const FONT   = { sm: T.sm, md: T.base, lg: T.md }[size] || T.base;
  const RADIUS = { sm: R.lg, md: R.xl, lg: R['2xl'] }[size] || R.xl;
  const PH     = { sm: 20, md: 28, lg: 36 }[size] || 28;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }).start();

  const inner = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <>
            {icon ? <Text style={{ fontSize: 18 }}>{icon}</Text> : null}
            <Text style={{ color: v.text, fontSize: FONT, fontWeight: T.bold, letterSpacing: 0.3 }}>
              {label}
            </Text>
          </>
      }
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled || loading}
      style={[fullWidth && { width: '100%' }, style]}
    >
      <Animated.View style={[{ transform: [{ scale }] }, v.shadow, disabled && { opacity: 0.5 }]}>
        {v.gradient ? (
          <LinearGradient
            colors={v.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.btn, { height: HEIGHT, borderRadius: RADIUS, paddingHorizontal: PH }]}
          >
            {inner}
          </LinearGradient>
        ) : (
          <View style={[
            styles.btn,
            { height: HEIGHT, borderRadius: RADIUS, paddingHorizontal: PH,
              backgroundColor: v.bg || 'transparent',
              borderWidth: v.border ? 2 : 0,
              borderColor: v.border || 'transparent' },
          ]}>
            {inner}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
