// ─────────────────────────────────────────────────────────────────────────────
//  BottomNavigation — Mady Design System
//  Lucide React Native · Outline · Minimalista
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient }    from 'expo-linear-gradient';
import { House, MapPin, ShieldAlert, Users, UserCircle } from 'lucide-react-native';

// ── Tokens ────────────────────────────────────────────────────────────────────
const TEAL    = '#18C5C8';
const CORAL   = '#FF7048';
const MUTED   = '#728096';
const WHITE   = '#FFFFFF';
const BG      = '#FFFFFF';
const BORDER  = '#EEF2F7';
const ACTIVE_BG = 'rgba(24,197,200,0.10)';

const ICON_SIZE     = 22;
const ICON_STROKE   = 1.75;
// Dock-style: el ícono activo se ve permanentemente más grande (scale, no un
// tamaño de ícono distinto) — así la transición entre activo/inactivo es un
// spring bounce fluido en vez de un salto de tamaño instantáneo.
const ACTIVE_SCALE  = 1.15;
const INACTIVE_SCALE = 1;

const TABS = [
  { key: 'Inicio',    icon: House,        label: 'Inicio'     },
  { key: 'Mapa',      icon: MapPin,       label: 'Mapa'       },
  { key: 'Reportar',  icon: ShieldAlert,  label: '',  isSOS: true },
  { key: 'Comunidad', icon: Users,        label: 'Comunidad'  },
  { key: 'Perfil',    icon: UserCircle,   label: 'Perfil'     },
];

// ── SOS central ───────────────────────────────────────────────────────────────
function SOSButton({ onPress }) {
  const ring = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1.22, duration: 950, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1,    duration: 950, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={sos.outer}>
      {/* Anillo pulsante */}
      <Animated.View
        style={[
          sos.ring,
          { transform: [{ scale: ring }] },
        ]}
        pointerEvents="none"
      />
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={sos.touchable}
      >
        <LinearGradient
          colors={[CORAL, '#E85A32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={sos.btn}
        >
          <ShieldAlert
            size={24}
            color={WHITE}
            strokeWidth={2}
          />
        </LinearGradient>
        <Text style={sos.label}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const sos = StyleSheet.create({
  outer:     { alignItems: 'center', marginTop: -22, position: 'relative' },
  ring:      {
    position: 'absolute',
    top: -10,
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,112,72,0.15)',
    zIndex: 0,
  },
  touchable: { alignItems: 'center', zIndex: 1 },
  btn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: WHITE,
    shadowColor: CORAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: CORAL,
    letterSpacing: 1.8,
    marginTop: 5,
  },
});

// ── Tab normal ────────────────────────────────────────────────────────────────
function TabItem({ tab, active, onPress }) {
  // Press feedback (momentáneo, como el resto de la app) y el tamaño
  // "activo" (permanente mientras esa pestaña es la actual) son dos
  // Animated.Value separados que se combinan con Animated.multiply — así
  // tocar una pestaña inactiva la achica un toque (0.88) sin pisar el
  // salto elástico al activo (1.15) cuando efectivamente navega ahí.
  const pressScale  = useRef(new Animated.Value(1)).current;
  const activeScale = useRef(new Animated.Value(active ? ACTIVE_SCALE : INACTIVE_SCALE)).current;

  const handlePressIn  = () => Animated.spring(pressScale, { toValue: 0.88, useNativeDriver: true, speed: 80 }).start();
  const handlePressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, speed: 80 }).start();

  useEffect(() => {
    // Spring bounce al pasar a activo o dejar de estarlo — no un salto
    // brusco. bounciness da el "overshoot" elástico típico de un dock.
    Animated.spring(activeScale, {
      toValue: active ? ACTIVE_SCALE : INACTIVE_SCALE,
      useNativeDriver: true,
      speed: 14,
      bounciness: 10,
    }).start();
  }, [active]);

  const Icon  = tab.icon;
  const color = active ? TEAL : MUTED;

  return (
    <TouchableOpacity
      style={ti.wrap}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          ti.inner, active && ti.innerActive,
          { transform: [{ scale: Animated.multiply(pressScale, activeScale) }] },
        ]}
      >
        <Icon size={ICON_SIZE} color={color} strokeWidth={ICON_STROKE} />
      </Animated.View>
      <Text style={[ti.label, active && ti.labelActive]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

const ti = StyleSheet.create({
  wrap:        { flex: 1, alignItems: 'center', paddingBottom: 2 },
  inner:       { width: 44, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  innerActive: { backgroundColor: ACTIVE_BG },
  label:       { fontSize: 10, fontWeight: '500', color: MUTED, marginTop: 1, letterSpacing: 0.2 },
  labelActive: { color: TEAL, fontWeight: '700' },
});

// ── Root ──────────────────────────────────────────────────────────────────────
export default function BottomNavigation({ state, navigation }) {
  const insets  = useSafeAreaInsets();
  const current = state?.index ?? 0;
  const routes  = state?.routes ?? [];

  const getRouteName = () => routes[current]?.name ?? '';

  const handlePress = (tab) => {
    if (tab.isSOS) {
      navigation.navigate('Reportar');
      return;
    }
    const route = routes.find(r => r.name === tab.key);
    if (route) navigation.navigate(route.name);
  };

  return (
    <View style={[nav.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        if (tab.isSOS) {
          return (
            <SOSButton
              key="SOS"
              onPress={() => navigation.navigate('Reportar')}
            />
          );
        }
        return (
          <TabItem
            key={tab.key}
            tab={tab}
            active={getRouteName() === tab.key}
            onPress={() => handlePress(tab)}
          />
        );
      })}
    </View>
  );
}

const nav = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    paddingHorizontal: 4,
    // Sombra suave hacia arriba
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },
});
