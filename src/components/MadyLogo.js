import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, FONTS, SHADOW } from '../theme';

export default function MadyLogo({ size = 72, showText = false, pulse = false }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.07, duration: 1600, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const outer  = size;
  const inner  = size * 0.76;
  const letter = size * 0.44;

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {/* Anillo dorado */}
        <View style={[styles.ring, { width: outer, height: outer, borderRadius: outer / 2 }, SHADOW.gold]}>
          {/* Núcleo crema */}
          <View style={[styles.core, { width: inner, height: inner, borderRadius: inner / 2 }]}>
            <Text style={[styles.letter, { fontSize: letter }]}>M</Text>
          </View>
        </View>
        {/* Puntos decorativos */}
        <View style={styles.dots}>
          <View style={[styles.dot, { width: 5, height: 5, opacity: 0.55 }]} />
          <View style={[styles.dot, { width: 8, height: 8 }]} />
          <View style={[styles.dot, { width: 5, height: 5, opacity: 0.55 }]} />
        </View>
      </Animated.View>

      {showText && (
        <Text style={[styles.brand, { fontSize: size * 0.28, marginTop: 10 }]}>
          MADY
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: FONTS.serif,
    fontWeight: FONTS.bold,
    fontStyle: 'italic',
    color: COLORS.gold,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  dot: {
    borderRadius: 99,
    backgroundColor: COLORS.gold,
  },
  brand: {
    fontFamily: FONTS.serif,
    fontWeight: FONTS.heavy,
    color: COLORS.black,
    letterSpacing: 10,
  },
});
