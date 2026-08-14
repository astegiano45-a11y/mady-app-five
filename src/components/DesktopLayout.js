import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';

/**
 * Envuelve la app en un layout de escritorio si es desktop,
 * sino muestra el contenido normal.
 */
export default function DesktopLayout({ children, currentScreen, navigation }) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return children; // En mobile, muestra el contenido normal
  }

  // En desktop, muestra un layout profesional
  return (
    <View style={st.container}>
      {/* NAVBAR DESKTOP */}
      <View style={st.navbar}>
        <Text style={st.logo}>🐾 Mady</Text>
        <View style={st.navLinks}>
          {[
            { label: 'Inicio', screen: 'Inicio' },
            { label: 'Mapa', screen: 'Mapa' },
            { label: 'Adopción', screen: 'Adopcion' },
            { label: 'Comunidad', screen: 'Comunidad' },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              onPress={() => navigation?.navigate(item.screen)}
              style={[st.navLink, currentScreen === item.screen && st.navLinkActive]}
            >
              <Text style={[st.navLinkTxt, currentScreen === item.screen && st.navLinkTxtActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={st.profileBtn}
          onPress={() => navigation?.navigate('Perfil')}
        >
          <Text style={st.profileBtnTxt}>👤 Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO */}
      <View style={st.content}>
        {children}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.cloud,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingHorizontal: S[24],
    paddingVertical: S[16],
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: S[24],
  },
  logo: {
    fontSize: T.xl,
    fontWeight: '800',
    color: C.teal,
  },
  navLinks: {
    flex: 1,
    flexDirection: 'row',
    gap: S[16],
  },
  navLink: {
    paddingVertical: S[8],
    paddingHorizontal: S[12],
    borderRadius: R.md,
  },
  navLinkActive: {
    backgroundColor: C.tealLight,
  },
  navLinkTxt: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.inkMid,
  },
  navLinkTxtActive: {
    color: C.teal,
    fontWeight: '700',
  },
  profileBtn: {
    backgroundColor: C.teal,
    paddingHorizontal: S[14],
    paddingVertical: S[10],
    borderRadius: R.lg,
  },
  profileBtnTxt: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.white,
  },
  content: {
    flex: 1,
    maxWidth: 1400, // Ancho máximo
    alignSelf: 'center',
    width: '100%',
  },
});
