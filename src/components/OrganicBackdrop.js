// ─────────────────────────────────────────────────────────────────────────────
//  OrganicBackdrop — formas orgánicas muy sutiles en las esquinas
//  Mismo concepto que "Mady Playground" (splash-mockup.png, opción 3), pero
//  con la paleta de la bandera de Tierra del Fuego (teal + sunset) en vez de
//  rosa/violeta. Puramente decorativo: pointerEvents="none", no cambia
//  layout ni funcionalidad — se coloca como primer hijo detrás del contenido.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

export default function OrganicBackdrop() {
  return (
    <View style={st.wrap} pointerEvents="none">
      <View style={[st.blob, st.blobTopRight]} />
      <View style={[st.blob, st.blobBottomLeft]} />
      <View style={[st.blob, st.blobAccent]} />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  // Forma "orgánica": radios asimétricos por esquina + rotación leve, en vez
  // de un círculo perfecto.
  blobTopRight: {
    width: 260, height: 260, top: -90, right: -70,
    backgroundColor: C.tealLight, opacity: 0.55,
    borderTopLeftRadius: 130, borderTopRightRadius: 90,
    borderBottomLeftRadius: 140, borderBottomRightRadius: 110,
    transform: [{ rotate: '12deg' }],
  },
  blobBottomLeft: {
    width: 220, height: 220, bottom: -80, left: -60,
    backgroundColor: C.sunsetLight, opacity: 0.6,
    borderTopLeftRadius: 100, borderTopRightRadius: 120,
    borderBottomLeftRadius: 90, borderBottomRightRadius: 130,
    transform: [{ rotate: '-8deg' }],
  },
  blobAccent: {
    width: 90, height: 90, top: '38%', right: -30,
    backgroundColor: C.tealMid, opacity: 0.18,
    borderTopLeftRadius: 45, borderTopRightRadius: 30,
    borderBottomLeftRadius: 50, borderBottomRightRadius: 40,
  },
});
