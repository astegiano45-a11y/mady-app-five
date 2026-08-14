// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · Navigation v3 — 5 tabs + auth guard
//  Tabs: Inicio · Extraviados · SOS · Comunidad · Perfil
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Platform,
  Animated, TouchableOpacity, Image,
} from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

// Auth
import { useAuth }     from '../context/AuthContext';
import LoginScreen     from '../screens/LoginScreen';
import RegisterScreen  from '../screens/RegisterScreen';

// App screens
import HomeScreen           from '../screens/HomeScreen';
import ExtraviodosScreen    from '../screens/ExtraviodosScreen';
import ReportarScreen       from '../screens/ReportarScreen';
import ComunidadScreen      from '../screens/ComunidadScreen';
import PerfilUsuarioScreen  from '../screens/PerfilUsuarioScreen';
import AgregarMascotaScreen from '../screens/AgregarMascotaScreen';
import PerfilMascotaScreen  from '../screens/PerfilMascotaScreen';
import MapScreen            from '../screens/MapScreen';
import EncontradosScreen      from '../screens/EncontradosScreen';
import AdopcionScreen         from '../screens/AdopcionScreen';
import PerfilAdoptanteScreen  from '../screens/PerfilAdoptanteScreen';
import MisFavoritosScreen     from '../screens/MisFavoritosScreen';
import NotificacionesScreen   from '../screens/NotificacionesScreen';

import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import BottomNavigation from '../components/BottomNavigation';
import DesktopLayout from '../components/DesktopLayout';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Splash de carga ───────────────────────────────────────────────────────────
function SplashLoader() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulse     = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrada: fade + scale spring
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start(() => {
      // Pulso suave continuo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={sp.screen}>
      {/* Logo Mady con animación */}
      <Animated.View style={[
        sp.logoWrap,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}>
        <Animated.Image
          source={require('../../assets/mady_logo.png')}
          style={[sp.logoImg, { transform: [{ scale: pulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Dots de carga */}
      <Animated.View style={[sp.dotsRow, { opacity: fadeAnim }]}>
        {[0, 1, 2].map((i) => <DotLoader key={i} delay={i * 180} />)}
      </Animated.View>
    </View>
  );
}

function DotLoader({ delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -7, duration: 280, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0,  duration: 280, useNativeDriver: true }),
        Animated.delay(500),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[sp.dot, { transform: [{ translateY: anim }] }]} />
  );
}

const sp = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width:  280,
    height: 280,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#0ABFBC',   // turquesa Mady
    opacity: 0.75,
  },
});

// ── Tab icon normal ───────────────────────────────────────────────────────────
function TabIcon({ emoji, label, focused, badge }) {
  return (
    <View style={[ti.wrap, focused && ti.wrapFocused]}>
      <View style={{ position: 'relative' }}>
        <Text style={[ti.emoji, focused && ti.emojiFocused]}>{emoji}</Text>
        {badge > 0 && (
          <View style={ti.badge}>
            <Text style={ti.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[ti.label, focused && ti.labelFocused]}>{label}</Text>
    </View>
  );
}

const ti = StyleSheet.create({
  wrap:        { alignItems: 'center', paddingTop: 6, paddingBottom: 2, paddingHorizontal: 10, borderRadius: RADIUS.md, minWidth: 56 },
  wrapFocused: { backgroundColor: COLORS.primaryLight },
  emoji:       { fontSize: 22 },
  emojiFocused:{ fontSize: 24 },
  label:       { fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  labelFocused:{ color: COLORS.primary, fontWeight: '700' },
  badge:       { position: 'absolute', top: -4, right: -8, backgroundColor: COLORS.sos, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.white },
  badgeText:   { fontSize: 8, color: COLORS.white, fontWeight: '800' },
});

// ── Botón SOS central ─────────────────────────────────────────────────────────
function SOSButton({ onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 1,    duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 0,    duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(255,71,87,0)', 'rgba(255,71,87,0.35)'],
  });

  return (
    <View style={sos.wrap}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={{ alignItems: 'center' }}
      >
        <Animated.View style={[sos.glow, { backgroundColor: glowColor, transform: [{ scale: scaleAnim }] }]} />
        <Animated.View style={[sos.btn, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={sos.icon}>🆘</Text>
        </Animated.View>
        <Text style={sos.label}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const sos = StyleSheet.create({
  wrap:  { alignItems: 'center', justifyContent: 'flex-start', marginTop: -20 },
  glow:  { position: 'absolute', top: -6, width: 74, height: 74, borderRadius: 37 },
  btn: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: COLORS.sos,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.white,
    ...SHADOW.sos,
  },
  icon:  { fontSize: 26 },
  label: { fontSize: 9, color: COLORS.sos, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
});

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen}
        options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

// ── Main Tabs (5 tabs) - Responsive Desktop/Mobile ────────────────────────────────
import { useIsDesktop } from '../hooks/useIsDesktop';

const Stack2 = createNativeStackNavigator();

function DesktopTabs({ navigation }) {
  const [currentScreen, setCurrentScreen] = React.useState('Inicio');

  // Navegación real: despacha al navigator anidado (Stack2) a través del
  // navigation del stack padre — React Navigation resuelve automáticamente
  // el screen dentro del navigator anidado con { screen }.
  // (Antes esto solo actualizaba estado local para el resaltado del link
  // activo y nunca navegaba de verdad.)
  const goTo = (screen) => {
    setCurrentScreen(screen);
    navigation.navigate('MainTabs', { screen });
  };

  return (
    <DesktopLayout
      currentScreen={currentScreen}
      navigation={{ navigate: goTo }}
    >
      <Stack2.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack2.Screen name="Inicio" component={HomeScreen} />
        <Stack2.Screen name="Mapa" component={MapScreen} />
        <Stack2.Screen name="Reportar" component={ReportarScreen} />
        <Stack2.Screen name="Adopcion" component={AdopcionScreen} />
        <Stack2.Screen name="Comunidad" component={ComunidadScreen} />
        <Stack2.Screen name="Perfil" component={PerfilUsuarioScreen} />
      </Stack2.Navigator>
    </DesktopLayout>
  );
}

function MainTabs({ navigation }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <DesktopTabs navigation={navigation} />;
  }

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Inicio"     component={HomeScreen}          />
      <Tab.Screen name="Mapa"       component={MapScreen}           />
      <Tab.Screen name="Reportar"   component={ReportarScreen}      />
      <Tab.Screen name="Comunidad"  component={ComunidadScreen}     />
      <Tab.Screen name="Perfil"     component={PerfilUsuarioScreen} />
    </Tab.Navigator>
  );
}

// ── App Stack (autenticado) ───────────────────────────────────────────────────
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"       component={MainTabs} />
      <Stack.Screen
        name="AgregarMascota"
        component={AgregarMascotaScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="PerfilMascota"
        component={PerfilMascotaScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Encontrados"
        component={EncontradosScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Adopcion"
        component={AdopcionScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PerfilAdoptante"
        component={PerfilAdoptanteScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MisFavoritos"
        component={MisFavoritosScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

// ── Root — Auth Guard ─────────────────────────────────────────────────────────
export default function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SplashLoader />;
  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
