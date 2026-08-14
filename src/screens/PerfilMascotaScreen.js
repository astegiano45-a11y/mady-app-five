import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Button      from '../components/Button';
import GoldDivider from '../components/GoldDivider';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import { actualizarMascota, eliminarMascota, subirFotoMascota } from '../services/mascotasService';
import { useIsDesktop } from '../hooks/useIsDesktop';

const STATUS_MAP = {
  home:  { label: 'En casa',    color: COLORS.success,  bg: COLORS.successBg, icon: '🏠' },
  lost:  { label: 'Perdido',    color: COLORS.error,    bg: COLORS.errorBg,   icon: '🚨' },
  found: { label: 'Encontrado', color: COLORS.warning,  bg: COLORS.warningBg, icon: '📍' },
};

function InfoRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={COLORS.textMuted}
        placeholder={`Ingresá ${label.toLowerCase()}`}
      />
    </View>
  );
}

export default function PerfilMascotaScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const petParam = route.params?.pet;
  const [pet, setPet]             = useState(petParam);
  const [status, setStatus]       = useState(petParam?.status || 'home');
  const [showEdit, setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Campos editables
  const [editName,  setEditName]  = useState(petParam?.name    || '');
  const [editBreed, setEditBreed] = useState(petParam?.breed   || '');
  const [editAge,   setEditAge]   = useState(petParam?.age     || '');
  const [editColor, setEditColor] = useState(petParam?.color   || '');
  const [editNotes, setEditNotes] = useState(petParam?.notes   || '');
  const [editPhoto, setEditPhoto] = useState(null); // nueva foto seleccionada

  if (!pet) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Mascota no encontrada</Text>
        <Button label="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const st = STATUS_MAP[status];

  const reportLost = () => {
    setStatus('lost');
    navigation.navigate('Reportar', { pet });
  };

  const markFound = () => {
    setStatus('home');
  };

  const pickEditPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setEditPhoto(result.assets[0]);
  };

  const handleSaveEdit = async () => {
    if (!pet.id) { setShowEdit(false); return; }
    setSaving(true);
    try {
      let photoUrl = pet.photo_url;
      if (editPhoto) {
        try { photoUrl = await subirFotoMascota(pet.id, editPhoto.uri, `foto_${Date.now()}.jpg`); } catch {}
      }
      const updated = await actualizarMascota(pet.id, {
        name:      editName,
        breed:     editBreed,
        age:       editAge,
        color:     editColor,
        notes:     editNotes,
        photo_url: photoUrl,
      });
      setPet(prev => ({ ...prev, ...updated }));
      setEditPhoto(null);
      setShowEdit(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try {
      await eliminarMascota(pet.id);
    } catch {}
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>

      {/* ── Modal confirmar eliminar ── */}
      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowDelete(false)}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>¿Eliminar a {pet.name}?</Text>
            <Text style={styles.dialogSub}>Esta acción no se puede deshacer.</Text>
            <View style={styles.dialogBtns}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowDelete(false)}>
                <Text style={styles.btnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDelete} onPress={handleDelete}>
                <Text style={styles.btnDeleteTxt}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal editar ── */}
      <Modal visible={showEdit} animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.editHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text style={styles.editCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Editar mascota</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              <Text style={[styles.editSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: COLORS.cream }} contentContainerStyle={{ padding: SPACING.lg }}>
            {/* Foto */}
            <TouchableOpacity style={styles.editPhotoBtn} onPress={pickEditPhoto}>
              {editPhoto
                ? <Image source={{ uri: editPhoto.uri }} style={styles.editPhotoImg} resizeMode="cover" />
                : pet.photo_url
                  ? <Image source={{ uri: pet.photo_url }} style={styles.editPhotoImg} resizeMode="cover" />
                  : <View style={styles.editPhotoPlaceholder}>
                      <Text style={{ fontSize: 32 }}>📷</Text>
                      <Text style={styles.editPhotoHint}>Cambiar foto</Text>
                    </View>
              }
              <View style={styles.editPhotoBadge}><Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700' }}>Cambiar</Text></View>
            </TouchableOpacity>
            <Field label="Nombre"  value={editName}  onChange={setEditName}  />
            <Field label="Raza"    value={editBreed} onChange={setEditBreed} />
            <Field label="Edad"    value={editAge}   onChange={setEditAge}   />
            <Field label="Color"   value={editColor} onChange={setEditColor} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notas</Text>
              <TextInput
                style={[styles.fieldInput, { height: 90, textAlignVertical: 'top' }]}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                placeholder="Notas adicionales"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Hero card ── */}
      <View style={[styles.hero, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.avatarBig}>
          {pet.photo_url
            ? <Image source={{ uri: pet.photo_url }} style={{ width: 110, height: 110, borderRadius: RADIUS.xl }} resizeMode="cover" />
            : <View style={{ width: 110, height: 110, borderRadius: RADIUS.xl, backgroundColor: '#0ABFBC25', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.emojiLg}>{pet.emoji || '🐾'}</Text>
              </View>
          }
        </View>

        <Text style={styles.heroName}>{pet.name}</Text>
        <Text style={styles.heroBreed}>{pet.breed} · {pet.species}</Text>

        <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.color + '50' }]}>
          <Text style={styles.statusIcon}>{st.icon}</Text>
          <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        showsVerticalScrollIndicator={false}
      >

        <Section title="📋 Información general">
          <InfoRow label="Género"  value={pet.gender}  icon="⚥" />
          <InfoRow label="Edad"    value={pet.age}     icon="🎂" />
          <InfoRow label="Tamaño"  value={pet.size}    icon="📏" />
          <InfoRow label="Color"   value={pet.color}   icon="🎨" />
          <InfoRow label="Peso"    value={pet.weight}  icon="⚖️" />
        </Section>

        <Section title="💉 Salud">
          <InfoRow label="Microchip" value={pet.chip || 'Sin registro'} icon="💾" />
          {pet.vaccines?.length > 0 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🩺</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Vacunas</Text>
                <View style={styles.vaccineRow}>
                  {pet.vaccines.map((v) => (
                    <View key={v} style={styles.vaccinePill}>
                      <Text style={styles.vaccinePillText}>✓ {v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <InfoRow label="Vacunas" value="Sin registros" icon="🩺" />
          )}
        </Section>

        {pet.notes ? (
          <Section title="📝 Notas">
            <Text style={styles.notes}>{pet.notes}</Text>
          </Section>
        ) : null}

        <GoldDivider />

        <View style={styles.actions}>
          {status === 'home' ? (
            <Button label="🚨  Reportar como perdido" variant="danger" size="lg"
              onPress={reportLost} style={{ marginBottom: SPACING.sm }} />
          ) : (
            <Button label="🏠  Marcar como encontrado" variant="primary" size="lg"
              onPress={markFound} style={{ marginBottom: SPACING.sm }} />
          )}
          <Button label="✏️  Editar perfil" variant="outline" size="md"
            onPress={() => setShowEdit(true)} style={{ marginBottom: SPACING.sm }} />
          {pet.id && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDelete(true)}>
              <Text style={styles.deleteBtnTxt}>🗑️  Eliminar mascota</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: SPACING['2xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn:  { position: 'absolute', left: SPACING.md, top: 0, padding: SPACING.sm, zIndex: 10 },
  backIcon: { fontSize: 32, color: COLORS.gold },

  avatarBig: {
    width: 110, height: 110, borderRadius: RADIUS.xl,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
    marginBottom: SPACING.md, ...SHADOW.md,
  },
  emojiLg:   { fontSize: 52 },
  heroName:  { fontSize: FONTS['2xl'], fontWeight: FONTS.heavy, color: COLORS.black, fontFamily: 'serif' },
  heroBreed: { fontSize: FONTS.base, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.sm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  statusIcon:  { fontSize: 14 },
  statusLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semibold },

  scroll: { padding: SPACING.lg },
  // Desktop (>900px): columna centrada, no estira el detalle de punta a punta
  scrollDesktop: { width: '100%', maxWidth: 640, alignSelf: 'center' },

  section:      { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.black, marginBottom: SPACING.sm, fontFamily: 'serif' },
  sectionCard:  { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOW.sm, overflow: 'hidden' },

  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoIcon:  { fontSize: 18, width: 22, textAlign: 'center' },
  infoLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: FONTS.base, color: COLORS.black, marginTop: 2, fontWeight: FONTS.medium },

  vaccineRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  vaccinePill:     { backgroundColor: COLORS.goldPale, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.gold + '50' },
  vaccinePillText: { fontSize: FONTS.xs, color: COLORS.goldDark, fontWeight: FONTS.medium },

  notes: { fontSize: FONTS.base, color: COLORS.textBody, lineHeight: 22, padding: SPACING.md },

  actions: {},

  deleteBtn:    { alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.error + '60', marginTop: 4 },
  deleteBtnTxt: { fontSize: FONTS.base, fontWeight: FONTS.semibold, color: COLORS.error },

  // Modal eliminar
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  dialogBox:  { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl, width: '100%', maxWidth: 320 },
  dialogTitle:{ fontSize: FONTS.lg, fontWeight: FONTS.heavy, color: COLORS.black, textAlign: 'center', marginBottom: 6 },
  dialogSub:  { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg },
  dialogBtns: { flexDirection: 'row', gap: 10 },
  btnCancel:  { flex: 1, paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelTxt:{ fontSize: FONTS.sm, fontWeight: FONTS.semibold, color: COLORS.textMuted },
  btnDelete:  { flex: 1, paddingVertical: 12, borderRadius: RADIUS.lg, backgroundColor: COLORS.error, alignItems: 'center' },
  btnDeleteTxt:{ fontSize: FONTS.sm, fontWeight: FONTS.semibold, color: COLORS.white },

  // Modal editar
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  editCancel: { fontSize: FONTS.base, color: COLORS.textMuted },
  editTitle:  { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.black },
  editSave:   { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.success },

  editPhotoBtn:         { alignSelf: 'center', marginBottom: SPACING.lg, position: 'relative' },
  editPhotoImg:         { width: 100, height: 100, borderRadius: RADIUS.xl },
  editPhotoPlaceholder: { width: 100, height: 100, borderRadius: RADIUS.xl, backgroundColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', gap: 4 },
  editPhotoHint:        { fontSize: FONTS.xs, color: COLORS.textMuted },
  editPhotoBadge:       { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.success, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },

  field:      { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONTS.xs, fontWeight: FONTS.semibold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONTS.base, color: COLORS.black },

  errorBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  errorText: { fontSize: FONTS.lg, color: COLORS.textMuted },
});
