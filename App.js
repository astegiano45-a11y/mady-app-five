// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · Entry Point — Semana 1
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';

const MAX_W = 430;

export default function App() {
  const isWeb = Platform.OS === 'web';

  const inner = (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (!isWeb) return inner;

  // Web: outer centering shell + phone-width constraint
  return (
    <View style={styles.webOuter}>
      <View style={styles.webInner}>
        {inner}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: MAX_W,
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    // shadow web only
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 24px 80px rgba(0,0,0,0.18)',
    } : {}),
  },
});
