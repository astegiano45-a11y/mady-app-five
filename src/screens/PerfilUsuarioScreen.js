import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  LogOut, ChevronRight, Shield, Bell, MapPin,
  Camera, Dog, Heart, AlertTriangle,
} from 'lucide-react-native';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { getMisMascotas, eliminarMascota } from '../services/mascotasService';
import { getAlertasMias } from '../services/alertasService';
import { supabase } from '../lib/supabase';

async function uploadAvatar(uri, base64, userId) {
  const path = `avatars/${userId}.jpg`;
  if (Platform.OS === 'web' || base64) {
    const byteChars = atob(base64);
    const byteNums  = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });
    await supabase.storage.from('mascotas').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  } else {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    await supabase.storage.from('mascotas').upload(path, blob, { upsert: true });
  }
  return supabase.storage.from('mascotas').getPublicUrl(path).data.publicUrl;
}

function MenuRow({ icon: Icon, label, value, onPress, danger, color }) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.menuIcon, { backgroundColor: (color || C.teal) + '18' }]}>
        <Icon size={18} color={color || C.teal} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuLabel, danger && { color: C.lost }]}>{label}</Text>
        {value ? <Text style={s.menuValue}>{value}</Text> : null}
      </View>
      <ChevronRight size={16} color={danger ? C.lost : C.inkMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function PerfilUsuarioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentUser, logout } = useAuth();

  const name     = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Usuario';
  const email    = currentUser?.email || '';
  const userId   = currentUser?.id;

  const [mascotas,      setMascotas]      = useState([]);
  const [alertasMias,   setAlertasMias]   = useState([]);
  const [avatar,        setAvatar]        = useState(currentUser?.user_metadata?.avatar_url || null);
  const [uploading,     setUploading]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeModal,   setActiveModal]   = useState(null); // 'notif' | 'zona' | 'privacidad'
  const [notifOn,       setNotifOn]       = useState(true);

  useEffect(() => {
    getMisMascotas().then(setMascotas).catch(() => {});
    getAlertasMias().then(setAlertasMias).catch(() => {});
  }, []);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(result.assets[0].uri, result.assets[0].base64, userId);
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      // Guardar también en profiles para que se vea consistente en toda la app
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
      setAvatar(url);
    } catch (err) { console.warn('Avatar update error:', err); }
    setUploading(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleEliminarMascota = async () => {
    if (!confirmDelete) return;
    try {
      await eliminarMascota(confirmDelete.id);
      setMascotas(prev => prev.filter(m => m.id !== confirmDelete.id));
    } catch {}
    setConfirmDelete(null);
  };

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
    {/* Modal confirmar eliminar mascota */}
    <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
      <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setConfirmDelete(null)}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>¿Eliminar a {confirmDelete?.name}?</Text>
          <Text style={s.modalSub}>Esta acción no se puede deshacer.</Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmDelete(null)}>
              <Text style={s.modalCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalConfirm} onPress={handleEliminarMascota}>
              <Text style={s.modalConfirmTxt}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>

    {/* Modal Notificaciones */}
    <Modal visible={activeModal === 'notif'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
      <View style={s.sheetBackdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Notificaciones</Text>
          <View style={s.sheetRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetRowLabel}>Alertas de mascotas perdidas</Text>
              <Text style={s.sheetRowSub}>Recibí avisos de tu zona</Text>
            </View>
            <TouchableOpacity
              style={[s.toggle, notifOn && s.toggleOn]}
              onPress={() => setNotifOn(v => !v)}
            >
              <View style={[s.toggleThumb, notifOn && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
          <View style={s.sheetRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetRowLabel}>Comunidad</Text>
              <Text style={s.sheetRowSub}>Nuevas publicaciones y comentarios</Text>
            </View>
            <TouchableOpacity style={[s.toggle, s.toggleOn]}>
              <View style={[s.toggleThumb, s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.sheetClose} onPress={() => setActiveModal(null)}>
            <Text style={s.sheetCloseTxt}>Listo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Modal Mi zona */}
    <Modal visible={activeModal === 'zona'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
      <View style={s.sheetBackdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Mi zona</Text>
          {['Río Grande', 'Tolhuin', 'Ushuaia'].map(z => (
            <TouchableOpacity key={z} style={s.sheetRow}>
              <Text style={s.sheetRowLabel}>{z}</Text>
              {z === 'Río Grande' && <Text style={{ color: C.teal, fontWeight: '700' }}>✓</Text>}
            </TouchableOpacity>
          ))}
          <Text style={[s.sheetRowSub, { paddingHorizontal: S[4], marginTop: 4 }]}>
            Las alertas que ves son de tu zona seleccionada.
          </Text>
          <TouchableOpacity style={s.sheetClose} onPress={() => setActiveModal(null)}>
            <Text style={s.sheetCloseTxt}>Listo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Modal Privacidad */}
    <Modal visible={activeModal === 'privacidad'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
      <View style={s.sheetBackdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Privacidad</Text>
          <Text style={s.sheetRowSub}>
            Mady App no comparte tus datos personales con terceros.{'\n\n'}
            Tu nombre y foto de perfil son visibles para otros usuarios de la comunidad.{'\n\n'}
            Podés solicitar la eliminación de tu cuenta enviando un correo a privacidad@madyapp.com
          </Text>
          <TouchableOpacity style={s.sheetClose} onPress={() => setActiveModal(null)}>
            <Text style={s.sheetCloseTxt}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <ScrollView
      style={{ flex: 1, backgroundColor: C.cloud }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[C.teal, C.tealDeep]}
        style={[s.headerGradient, { paddingTop: insets.top + 16 }]}
      >
        {/* Avatar */}
        <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar}>
          {uploading ? (
            <View style={[s.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: C.tealDark }]}>
              <ActivityIndicator color={C.white} />
            </View>
          ) : avatar ? (
            <Image source={{ uri: avatar }} style={s.avatar} resizeMode="cover" />
          ) : (
            <View style={[s.avatar, { backgroundColor: C.tealDark, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={s.initials}>{initials}</Text>
            </View>
          )}
          <View style={s.cameraBtn}>
            <Camera size={12} color={C.white} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        <Text style={s.headerName}>{name}</Text>
        <Text style={s.headerEmail}>{email}</Text>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{mascotas.length}</Text>
            <Text style={s.statLbl}>Mascotas</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{alertasMias.length}</Text>
            <Text style={s.statLbl}>Alertas</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{alertasMias.filter(a => a.status === 'resolved').length}</Text>
            <Text style={s.statLbl}>Rescates</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Mis mascotas resumen */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Mis mascotas</Text>
        {mascotas.length === 0 ? (
          <TouchableOpacity
            style={s.emptyMascotas}
            onPress={() => navigation.navigate('AgregarMascota')}
          >
            <Dog size={28} color={C.teal} strokeWidth={1.5} />
            <Text style={s.emptyTxt}>Registrá tu primera mascota</Text>
            <Text style={s.emptyHint}>Toca para agregar →</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 8 }}>
            {mascotas.map(m => (
              <TouchableOpacity
                key={m.id}
                style={s.petRow}
                onPress={() => navigation.navigate('PerfilMascota', { pet: m })}
                activeOpacity={0.7}
              >
                {m.photo_url
                  ? <Image source={{ uri: m.photo_url }} style={s.petAvatar} resizeMode="cover" />
                  : <View style={[s.petAvatar, { backgroundColor: C.tealLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 22 }}>🐾</Text>
                    </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={s.petName}>{m.name}</Text>
                  <Text style={s.petBreed}>{m.breed || m.species}{m.age ? ` · ${m.age}` : ''}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: m.status === 'home' ? C.foundBg : C.lostBg }]}>
                  <Text style={[s.statusTxt, { color: m.status === 'home' ? C.found : C.lost }]}>
                    {m.status === 'home' ? 'En casa' : 'Perdido'}
                  </Text>
                </View>
                <TouchableOpacity style={s.petDeleteBtn} onPress={(e) => { e.stopPropagation?.(); setConfirmDelete(m); }}>
                  <Text style={s.petDeleteTxt}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.addPetBtn}
              onPress={() => navigation.navigate('AgregarMascota')}
            >
              <Text style={s.addPetTxt}>+ Agregar mascota</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Menú */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Cuenta</Text>
        <View style={s.menuCard}>
          <MenuRow icon={Bell}          label="Notificaciones"  value={notifOn ? 'Activadas' : 'Desactivadas'} onPress={() => setActiveModal('notif')} color={C.teal}  />
          <View style={s.menuDivider} />
          <MenuRow icon={MapPin}        label="Mi zona"         value="Río Grande"       onPress={() => setActiveModal('zona')} color={C.teal}  />
          <View style={s.menuDivider} />
          <MenuRow icon={Shield}        label="Privacidad"                               onPress={() => setActiveModal('privacidad')} color={C.coral} />
          <View style={s.menuDivider} />
          <MenuRow icon={Heart}         label="Mis reportes"                             onPress={() => navigation.navigate('Reportar')} color={C.found} />
        </View>
      </View>

      {/* Cerrar sesión */}
      <View style={[s.section, { marginTop: 0 }]}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={C.lost} strokeWidth={2} />
          <Text style={s.logoutTxt}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  headerGradient: {
    alignItems: 'center', paddingBottom: S[32],
    paddingHorizontal: S[20],
  },

  avatarWrap: { position: 'relative', marginBottom: S[12] },
  avatar:     { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  initials:   { fontSize: T['3xl'], fontWeight: '800', color: C.white },
  cameraBtn:  {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.coral, borderWidth: 2, borderColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },

  headerName:  { fontSize: T.xl, fontWeight: '800', color: C.white, marginBottom: 2 },
  headerEmail: { fontSize: T.sm, color: 'rgba(255,255,255,0.75)', marginBottom: S[20] },

  statsRow:    { flexDirection: 'row', gap: S[24] },
  statItem:    { alignItems: 'center' },
  statVal:     { fontSize: T.xl, fontWeight: '800', color: C.white },
  statLbl:     { fontSize: T.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  section:      { margin: S[16], marginBottom: 0 },
  sectionTitle: { fontSize: T.sm, fontWeight: '700', color: C.inkLight, marginBottom: S[10], textTransform: 'uppercase', letterSpacing: 0.8 },

  // Mascotas
  emptyMascotas: {
    backgroundColor: C.white, borderRadius: R.xl, padding: S[24],
    alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  emptyTxt:  { fontSize: T.base, fontWeight: '700', color: C.ink },
  emptyHint: { fontSize: T.sm, color: C.teal, fontWeight: '600' },

  petRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: R.xl, padding: S[12],
    borderWidth: 1, borderColor: C.border,
  },
  petAvatar:  { width: 44, height: 44, borderRadius: 22 },
  petName:    { fontSize: T.base, fontWeight: '700', color: C.ink },
  petBreed:   { fontSize: T.xs, color: C.inkLight, marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full },
  statusTxt:  { fontSize: T.xs, fontWeight: '700' },

  addPetBtn: { alignItems: 'center', paddingVertical: 12 },
  addPetTxt: { fontSize: T.sm, fontWeight: '700', color: C.teal },

  petDeleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  petDeleteTxt: { fontSize: 12, color: '#DC2626', fontWeight: '700' },

  // Modal eliminar
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBox:       { backgroundColor: C.white, borderRadius: R['2xl'], padding: S[24], width: '100%', maxWidth: 320 },
  modalTitle:     { fontSize: T.lg, fontWeight: '800', color: C.ink, marginBottom: 6, textAlign: 'center' },
  modalSub:       { fontSize: T.sm, color: C.inkLight, marginBottom: S[20], textAlign: 'center' },
  modalBtns:      { flexDirection: 'row', gap: 10 },
  modalCancel:    { flex: 1, paddingVertical: 12, borderRadius: R.xl, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  modalCancelTxt: { fontSize: T.sm, fontWeight: '700', color: C.inkMid },
  modalConfirm:   { flex: 1, paddingVertical: 12, borderRadius: R.xl, backgroundColor: C.lost, alignItems: 'center' },
  modalConfirmTxt:{ fontSize: T.sm, fontWeight: '700', color: C.white },

  // Menú
  menuCard:    { backgroundColor: C.white, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  menuRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: S[16] },
  menuIcon:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  menuLabel:   { fontSize: T.base, fontWeight: '600', color: C.ink },
  menuValue:   { fontSize: T.xs, color: C.inkLight, marginTop: 1 },
  menuDivider: { height: 1, backgroundColor: C.borderLight, marginLeft: S[16] + 36 + 12 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.lostBg, paddingVertical: 16, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.lost + '30',
  },
  logoutTxt: { fontSize: T.base, fontWeight: '700', color: C.lost },

  // Bottom sheet modales
  sheetBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: C.white, borderTopLeftRadius: R['2xl'], borderTopRightRadius: R['2xl'], padding: S[24], paddingBottom: 40 },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: S[20] },
  sheetTitle:     { fontSize: T.xl, fontWeight: '800', color: C.ink, marginBottom: S[16] },
  sheetRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: S[14], borderBottomWidth: 1, borderBottomColor: C.border },
  sheetRowLabel:  { fontSize: T.base, fontWeight: '600', color: C.ink },
  sheetRowSub:    { fontSize: T.sm, color: C.inkLight, marginTop: 2, lineHeight: 20 },
  sheetClose:     { marginTop: S[20], backgroundColor: C.teal, borderRadius: R.xl, paddingVertical: 14, alignItems: 'center' },
  sheetCloseTxt:  { fontSize: T.base, fontWeight: '700', color: C.white },

  // Toggle switch
  toggle:         { width: 48, height: 28, borderRadius: 14, backgroundColor: C.border, padding: 2, justifyContent: 'center' },
  toggleOn:       { backgroundColor: C.teal },
  toggleThumb:    { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, alignSelf: 'flex-start' },
  toggleThumbOn:  { alignSelf: 'flex-end' },
});
