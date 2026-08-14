// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · Entry Point — Semana 1
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';
import { DESKTOP_BREAKPOINT } from './src/hooks/useIsDesktop';

const MOBILE_FRAME_W = 430;

export default function App() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const inner = (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (!isWeb) return inner;

  // Desktop/pantallas anchas: sin marco de teléfono — la app usa todo el ancho
  // y cada pantalla decide su propio layout responsive (ver useIsDesktop).
  if (isDesktop) {
    return <View style={styles.webFull}>{inner}</View>;
  }

  // Ventanas angostas en web (o mobile real): se mantiene el "marco de teléfono"
  // flotante, que es simplemente una simulación de app para navegadores angostos.
  return (
    <View style={styles.webOuter}>
      <View style={styles.webInner}>
        {inner}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webFull: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webOuter: {
    flex: 1,
    backgroundColor: '#D6E0EC',
    alignItems: 'center',
    justifyContent: 'center',
    // subtle dot grid — web only CSS
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, #b8c8da 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    } : {}),
  },
  webInner: {
    width: '100%',
    maxWidth: MOBILE_FRAME_W,
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    // shadow web only
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 24px 80px rgba(0,0,0,0.18)',
    } : {}),
  },
});
