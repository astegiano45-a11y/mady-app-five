// ─────────────────────────────────────────────────────────────────────────────
//  SightingCaptureModal — "Lo vi aquí" con foto (etapa 2, docs/plan-avistamientos.md)
//
//  1. Quien la vio saca una foto (cámara) o, si no hay cámara/permiso, elige
//     una de la galería.
//  2. En ese momento se toma la ubicación GPS precisa: el avistamiento queda
//     donde se sacó la foto, no donde la persona aprieta "Enviar".
//  3. Vista previa + nota opcional → se sube la foto y se guarda el avistamiento.
//
//  Es un <Modal> y no Alert.alert: react-native-web implementa Alert.alert
//  como no-op (ver comentario en MapScreen).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, Modal, TextInput,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentLocation } from '../services/LocationService';
import { createSighting, uploadSightingPhoto } from '../services/sightingsService';
import { sightingPlaceLabel } from '../utils/sightings';
import { FONTS, RADIUS, SHADOW, SPACING } from '../theme';

const PICKER_OPTS = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true };

export default function SightingCaptureModal({ pin, lostPoint, onClose, onSubmitted }) {
  const [photo, setPhoto]       = useState(null);   // { uri, base64, fromGallery }
  const [coords, setCoords]     = useState(null);   // { lat, lng, at }
  const [locating, setLocating] = useState(false);
  const [note, setNote]         = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  // Cada vez que se abre para otra mascota, arranca de cero
  useEffect(() => {
    setPhoto(null); setCoords(null); setNote(''); setError(''); setSending(false);
  }, [pin?.id]);

  if (!pin) return null;

  const locate = async () => {
    setLocating(true);
    setError('');
    try {
      const loc = await getCurrentLocation({ highAccuracy: true });
      if (!loc) {
        setCoords(null);
        setError('No pudimos obtener tu ubicación. Activá el GPS (o el permiso de ubicación) y tocá "Reintentar ubicación".');
        return;
      }
      setCoords({ ...loc, at: new Date() });
    } finally {
      setLocating(false);
    }
  };

  const pick = async (fromGallery) => {
    setError('');
    try {
      let result;
      if (fromGallery) {
        result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
      } else {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setError('Sin permiso de cámara. Podés elegir una foto de la galería.');
            return;
          }
        }
        result = await ImagePicker.launchCameraAsync(PICKER_OPTS);
      }
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      setPhoto({ uri: a.uri, base64: a.base64, fromGallery });
      await locate(); // ubicación en el momento de la foto
    } catch (e) {
      setError('No pudimos abrir la cámara. Probá con "Elegir de la galería".');
    }
  };

  const send = async () => {
    if (!photo || !coords || sending) return;
    setSending(true);
    setError('');
    try {
      const photoUrl = await uploadSightingPhoto(pin.id, photo);
      const sighting = await createSighting({
        alertaId: pin.id, lat: coords.lat, lng: coords.lng, photoUrl, description: note,
      });
      onSubmitted?.(sighting);
    } catch (e) {
      setError('No pudimos guardar el avistamiento. Revisá tu conexión y tocá "Enviar" de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => { setPhoto(null); setCoords(null); setError(''); };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={sending ? undefined : onClose}>
        <Pressable style={st.box} onPress={() => {}}>
          {/* Con foto + nota + botones no entra en pantallas bajas: se desplaza */}
          <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
          <Text style={st.title}>¿Viste a {pin.name}?</Text>

          {!photo ? (
            <>
              <Text style={st.sub}>
                Sacá una foto ahora. Guardamos tu ubicación y la hora para que el dueño sepa por dónde anda.
              </Text>
              <Pressable
                style={[st.btn, st.btnMain]}
                onPress={() => pick(false)}
                accessibilityRole="button"
              >
                <Text style={st.btnMainText}>📷 Sacar foto</Text>
              </Pressable>
              <Pressable
                style={[st.btn, st.btnGhost]}
                onPress={() => pick(true)}
                accessibilityRole="button"
              >
                <Text style={st.btnGhostText}>Elegir de la galería</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Image source={{ uri: photo.uri }} style={st.preview} resizeMode="cover"
                accessibilityLabel={`Foto del avistamiento de ${pin.name}`} />

              <View style={st.locRow}>
                {locating ? (
                  <>
                    <ActivityIndicator size="small" color="#10B981" />
                    <Text style={st.locText}>Obteniendo tu ubicación…</Text>
                  </>
                ) : coords ? (
                  <Text style={st.locText}>📍 {sightingPlaceLabel(coords, lostPoint)}</Text>
                ) : null}
              </View>
              {photo.fromGallery && coords && (
                <Text style={st.hint}>
                  Usamos tu ubicación actual: elegí una foto que hayas sacado acá.
                </Text>
              )}

              <TextInput
                style={st.input}
                value={note}
                onChangeText={setNote}
                placeholder="Nota opcional: hacia dónde iba, si tenía collar…"
                placeholderTextColor="#9CA3AF"
                maxLength={200}
                multiline
                editable={!sending}
              />

              <Pressable
                style={[st.btn, st.btnMain, (!coords || sending) && st.btnDisabled]}
                onPress={send}
                disabled={!coords || sending}
                accessibilityRole="button"
              >
                <Text style={st.btnMainText}>{sending ? 'Enviando…' : 'Enviar avistamiento'}</Text>
              </Pressable>
              {!coords && !locating ? (
                <Pressable style={[st.btn, st.btnGhost]} onPress={locate} accessibilityRole="button">
                  <Text style={st.btnGhostText}>Reintentar ubicación</Text>
                </Pressable>
              ) : (
                <Pressable style={[st.btn, st.btnGhost]} onPress={reset} disabled={sending} accessibilityRole="button">
                  <Text style={st.btnGhostText}>Sacar otra foto</Text>
                </Pressable>
              )}
            </>
          )}

          {!!error && <Text style={st.error} accessibilityRole="alert">{error}</Text>}

          <Pressable style={st.cancel} onPress={onClose} disabled={sending} accessibilityRole="button">
            <Text style={st.cancelText}>Cancelar</Text>
          </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box:          { backgroundColor: '#FFF', borderRadius: RADIUS.xl, width: '100%', maxWidth: 380, maxHeight: '92%', overflow: 'hidden', ...SHADOW.lg },
  content:      { padding: SPACING.lg, gap: SPACING.sm },
  title:        { fontSize: FONTS.lg, fontWeight: '800', color: '#111827', textAlign: 'center' },
  sub:          { fontSize: FONTS.sm, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xs },
  preview:      { width: '100%', height: 220, borderRadius: RADIUS.lg, backgroundColor: '#F3F4F6' },
  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 22 },
  locText:      { fontSize: FONTS.sm, color: '#374151', fontWeight: '600', flexShrink: 1 },
  hint:         { fontSize: FONTS.xs, color: '#92400E' },
  input:        { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: RADIUS.md, padding: SPACING.sm, minHeight: 60, fontSize: FONTS.sm, color: '#111827', textAlignVertical: 'top' },
  btn:          { borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  btnMain:      { backgroundColor: '#047857' },
  btnMainText:  { fontSize: FONTS.base, fontWeight: '700', color: '#FFF' },
  btnGhost:     { backgroundColor: '#F3F4F6' },
  btnGhostText: { fontSize: FONTS.sm, fontWeight: '700', color: '#374151' },
  btnDisabled:  { opacity: 0.55 },
  error:        { fontSize: FONTS.sm, color: '#B91C1C', textAlign: 'center' },
  cancel:       { paddingVertical: SPACING.xs, alignItems: 'center' },
  cancelText:   { fontSize: FONTS.sm, fontWeight: '600', color: '#6B7280' },
});
