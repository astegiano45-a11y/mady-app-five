// ─────────────────────────────────────────────────────────────────────────────
//  TouchGlow — equivalente táctil del "SpotlightCard" de React Bits
//
//  El original sigue el mouse con un gradiente radial. Acá no hay mouse:
//  el glow aparece en el punto exacto donde se apoya el dedo (onPressIn),
//  se expande y se atenúa (~450ms) y desaparece — un solo pulso por toque,
//  no un seguimiento continuo.
//
//  No pinta nada hasta que se llama a trigger(x, y) vía ref, así que se monta
//  como overlay absoluto encima del contenido de la tarjeta y el padre lo
//  dispara desde su propio onPressIn (no agrega un segundo touch responder).
// ─────────────────────────────────────────────────────────────────────────────
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const PULSE_MS = 450;
let uidCounter = 0;

const TouchGlow = forwardRef(function TouchGlow(
  { width, height, color = '#18C5C8' },
  ref
) {
  const progress = useRef(new Animated.Value(0)).current;
  const [origin, setOrigin] = useState({ x: width / 2, y: height / 2 });
  const [active, setActive] = useState(false);
  // Los ids de SVG son únicos por documento, no por <Svg> — con varias
  // tarjetas montadas a la vez, todas compartiendo "touchGlow" harían que
  // el navegador resuelva url(#touchGlow) contra la primera definición que
  // encuentre, mostrando el color de esa card en el resto.
  const gradientId = useRef(`touchGlow-${uidCounter++}`).current;

  useImperativeHandle(ref, () => ({
    trigger(x, y) {
      if (!width || !height) return; // todavía no midió layout (QuickAction)
      setOrigin({ x: x ?? width / 2, y: y ?? height / 2 });
      setActive(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: PULSE_MS,
        useNativeDriver: false, // animamos props de SVG (r, opacity), no style
      }).start(() => setActive(false));
    },
  }));

  if (!active || !width || !height) return null;

  const maxR = Math.max(width, height) * 0.85;
  const r = progress.interpolate({ inputRange: [0, 1], outputRange: [0, maxR] });
  // Pico rápido de opacidad y luego se apaga hacia el final del pulso —
  // se ve como un destello, no como un círculo que solo crece.
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <Defs>
        {/* stopOpacity, no un color rgba manual — así `color` puede ser
            cualquier hex del theme (C.teal, item.color de cada categoría, …) */}
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <AnimatedCircle cx={origin.x} cy={origin.y} r={r} fill={`url(#${gradientId})`} opacity={opacity} />
    </Svg>
  );
});

export default TouchGlow;
