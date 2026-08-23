// ─────────────────────────────────────────────────────────────────────────────
//  InfoModal — reemplazo de Alert.alert() de un solo botón
//  react-native-web (lo que corre esta app en producción, vía Vercel) implementa
//  Alert.alert() como un no-op total: "static alert() {}" en
//  node_modules/react-native-web/src/exports/Alert/index.js — no dialoga, no
//  dispara callbacks, no hace nada. Cualquier pantalla que dependa de
//  Alert.alert para avisar éxito/error queda muda en el navegador aunque la
//  operación de fondo (guardar, borrar, etc.) haya funcionado bien.
//  Este componente es el reemplazo mínimo: mismo look que los modales de
//  confirmación que ya usan PerfilUsuarioScreen/ReportarScreen/MapScreen.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';

export default function InfoModal({ visible, title, body, onClose, closeLabel = 'OK' }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={st.box}>
          <Text style={st.title}>{title}</Text>
          {body ? <Text style={st.sub}>{body}</Text> : null}
          <TouchableOpacity style={st.btn} onPress={onClose}>
            <Text style={st.btnTxt}>{closeLabel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  box:      { backgroundColor: C.white, borderRadius: R['2xl'], padding: S[24], width: '100%', maxWidth: 320 },
  title:    { fontSize: T.lg, fontWeight: '800', color: C.ink, marginBottom: 6, textAlign: 'center' },
  sub:      { fontSize: T.sm, color: C.inkLight, marginBottom: S[20], textAlign: 'center', lineHeight: 20 },
  btn:      { backgroundColor: C.teal, borderRadius: R.xl, paddingVertical: 12, alignItems: 'center' },
  btnTxt:   { fontSize: T.sm, fontWeight: '700', color: C.white },
});
