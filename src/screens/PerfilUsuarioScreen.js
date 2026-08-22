import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Platform, Modal, Alert,
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
import { getAlertasMias, resolverAlerta } from '../services/alertasService';
import { getPendingAdoptionRequests, respondAdoptionMatch } from '../services/adoptantService';
import { supabase } from '../lib/supabase';

// Antes "Mis reportes" navegaba directo a crear una alerta nueva — nunca
// mostraba las que ya tenías. Este mapa es el mismo criterio de colores que
// ya usa NotificacionesScreen para el tipo de alerta.
const REPORT_TYPE = {
  lost:     { label: 'Perdido',    color: C.lost,  bg: C.lostBg },
  found:    { label: 'Encontrado', color: C.found, bg: C.foundBg },
  adoption: { label: 'Adopción',   color: C.teal,  bg: C.tealLight },
};

function formatTimeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 60)   return `hace ${diff} min`;
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
  return `hace ${Math.floor(diff / 1440)} días`;
}

// Resumen rápido de cuánta preparación real tiene el adoptante, a partir de
// las respuestas del cuestionario nuevo — para que el dueño no tenga que leer
// las 2 respuestas de texto libre de cada solicitud para decidir a cuáles
// prestarles atención primero.
function semaforoSolicitud(qa) {
  if (qa?.hasExperience) return { emoji: '🟢', label: 'Con experiencia' };
  if (qa?.willingToLearn) return { emoji: '🟡', label: 'Sin experiencia, dispuesto/a a informarse' };
  return { emoji: '🔴', label: 'Sin experiencia' };
}

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
  const [activeModal,   setActiveModal]   = useState(null); // 'notif' | 'zona' | 'privacidad' | 'reportes'
  const [notifOn,       setNotifOn]       = useState(true);
  const [confirmResolve, setConfirmResolve] = useState(null); // alerta a confirmar como resuelta
  const [resolvingId,    setResolvingId]    = useState(null); // id de la alerta resolviéndose ahora
  const [solicitudes,    setSolicitudes]    = useState([]); // solicitudes de adopción pendientes sobre mis mascotas
  const [respondingId,   setRespondingId]   = useState(null); // match_id respondiéndose ahora

  useEffect(() => {
    getMisMascotas().then(setMascotas).catch(() => {});
    getAlertasMias().then(setAlertasMias).catch(() => {});
    getPendingAdoptionRequests().then(setSolicitudes).catch(() => {});
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

  // resolverAlerta() ya existía en alertasService.js pero nada la llamaba —
  // las alertas quedaban "active" para siempre. Actualiza local solo si el
  // UPDATE en Supabase confirma éxito.
  const handleResolverAlerta = async () => {
    if (!confirmResolve) return;
    const id = confirmResolve.id;
    setConfirmResolve(null);
    setResolvingId(id);
    try {
      await resolverAlerta(id);
      setAlertasMias(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    } catch {
      Alert.alert('No se pudo actualizar', 'Revisá tu conexión e intentá de nuevo.');
    }
    setResolvingId(null);
  };

  // Aprobar/rechazar una solicitud de adopción. respondAdoptionMatch() llama
  // a la RPC respond_adoption_match(), que verifica del lado del servidor
  // que quien llama sea el dueño de la alerta antes de tocar owner_liked —
  // acá no hace falta (ni conviene) un UPDATE directo a adoption_matches.
  const handleResponderSolicitud = async (matchId, approve) => {
    setRespondingId(matchId);
    try {
      await respondAdoptionMatch(matchId, approve);
      setSolicitudes(prev => prev.filter(r => r.match_id !== matchId));
    } catch {
      Alert.alert('No se pudo actualizar', 'Revisá tu conexión e intentá de nuevo.');
    }
    setRespondingId(null);
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

    {/* Modal Mis reportes */}
    <Modal visible={activeModal === 'reportes'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
      <View style={s.sheetBackdrop}>
        <View style={[s.sheet, { maxHeight: '80%' }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Mis reportes</Text>

          {alertasMias.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: S[24], gap: 8 }}>
              <Text style={{ fontSize: 32 }}>📋</Text>
              <Text style={s.sheetRowSub}>Todavía no reportaste ninguna alerta.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {alertasMias.map(a => {
                const t = REPORT_TYPE[a.type] || REPORT_TYPE.lost;
                const resolved = a.status === 'resolved';
                return (
                  <View key={a.id} style={s.reportRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.reportName}>{a.name}</Text>
                        <View style={[s.reportBadge, { backgroundColor: t.bg }]}>
                          <Text style={[s.reportBadgeTxt, { color: t.color }]}>{t.label}</Text>
                        </View>
                      </View>
                      <Text style={s.reportMeta}>{a.zone} · {formatTimeAgo(a.created_at)}</Text>
                    </View>
                    {resolved ? (
                      <View style={s.reportResolvedPill}>
                        <Text style={s.reportResolvedTxt}>✅ Resuelta</Text>
                      </View>
                    ) : resolvingId === a.id ? (
                      <ActivityIndicator size="small" color={C.teal} />
                    ) : (
                      <TouchableOpacity style={s.reportResolveBtn} onPress={() => setConfirmResolve(a)}>
                        <Text style={s.reportResolveTxt}>Marcar resuelta</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[s.sheetClose, { marginTop: S[16] }]}
            onPress={() => { setActiveModal(null); navigation.navigate('Reportar'); }}
          >
            <Text style={s.sheetCloseTxt}>+ Nuevo reporte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Modal Solicitudes de adopción — dueño aprueba/rechaza. Sin modal de
        confirmación extra: el par de botones ya es la decisión deliberada. */}
    <Modal visible={activeModal === 'solicitudes'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
      <View style={s.sheetBackdrop}>
        <View style={[s.sheet, { maxHeight: '80%' }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Solicitudes de adopción</Text>

          {solicitudes.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: S[24], gap: 8 }}>
              <Text style={{ fontSize: 32 }}>💌</Text>
              <Text style={s.sheetRowSub}>No tenés solicitudes pendientes.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {solicitudes.map(r => {
                const sem = semaforoSolicitud(r.questions_answers);
                const responding = respondingId === r.match_id;
                return (
                  <View key={r.match_id} style={s.solicitudRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.solicitudName}>{r.adoptant_name || 'Usuario'}</Text>
                      <Text style={s.solicitudArrow}>quiere adoptar a</Text>
                      <Text style={s.solicitudName}>{r.alerta_name}</Text>
                    </View>
                    <View style={[s.reportBadge, { backgroundColor: C.cloud, marginTop: 6 }]}>
                      <Text style={s.reportBadgeTxt}>{sem.emoji} {sem.label}</Text>
                    </View>
                    {r.questions_answers?.reason ? (
                      <Text style={s.solicitudQA} numberOfLines={2}>
                        <Text style={{ fontWeight: '700' }}>Por qué quiere adoptar: </Text>
                        {r.questions_answers.reason}
                      </Text>
                    ) : null}
                    {r.questions_answers?.behaviorPlan ? (
                      <Text style={s.solicitudQA} numberOfLines={2}>
                        <Text style={{ fontWeight: '700' }}>Ante un problema de comportamiento: </Text>
                        {r.questions_answers.behaviorPlan}
                      </Text>
                    ) : null}
                    <Text style={s.reportMeta}>{formatTimeAgo(r.requested_at)}</Text>

                    {responding ? (
                      <ActivityIndicator size="small" color={C.teal} style={{ marginTop: 10 }} />
                    ) : (
                      <View style={s.solicitudBtns}>
                        <TouchableOpacity
                          style={s.solicitudReject}
                          onPress={() => handleResponderSolicitud(r.match_id, false)}
                        >
                          <Text style={s.solicitudRejectTxt}>Rechazar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.solicitudApprove}
                          onPress={() => handleResponderSolicitud(r.match_id, true)}
                        >
                          <Text style={s.solicitudApproveTxt}>Aprobar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={[s.sheetClose, { marginTop: S[16] }]} onPress={() => setActiveModal(null)}>
            <Text style={s.sheetCloseTxt}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Modal confirmar resolver alerta — declarado DESPUÉS del modal "Mis
        reportes" a propósito: en React Native Web cada <Modal> inserta su
        nodo en el DOM en el orden en que aparece en el árbol (no quién se
        volvió visible más tarde), así que si este confirm quedaba declarado
        antes, el modal de "Mis reportes" -que ya estaba montado- lo tapaba
        por completo aunque el texto sí estuviera en el DOM. */}
    <Modal visible={!!confirmResolve} transparent animationType="fade" onRequestClose={() => setConfirmResolve(null)}>
      <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setConfirmResolve(null)}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>¿Confirmás que {confirmResolve?.name} ya se resolvió?</Text>
          <Text style={s.modalSub}>Va a dejar de aparecer como alerta activa en el mapa y en "Cerca de ti".</Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmResolve(null)}>
              <Text style={s.modalCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalConfirm, { backgroundColor: C.teal }]} onPress={handleResolverAlerta}>
              <Text style={s.modalConfirmTxt}>Sí, resolver</Text>
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
          <MenuRow icon={Heart}         label="Mis reportes"       value={`${alertasMias.length}`} onPress={() => setActiveModal('reportes')} color={C.found} />
          <View style={s.menuDivider} />
          <MenuRow
            icon={Heart}
            label="Solicitudes de adopción"
            value={solicitudes.length > 0 ? `${solicitudes.length} pendiente${solicitudes.length === 1 ? '' : 's'}` : 'Sin pendientes'}
            onPress={() => setActiveModal('solicitudes')}
            color={C.coral}
          />
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

  // Mis reportes
  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: S[12], borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  reportName:   { fontSize: T.base, fontWeight: '700', color: C.ink },
  reportBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.full },
  reportBadgeTxt: { fontSize: 10, fontWeight: '700' },
  reportMeta:   { fontSize: T.xs, color: C.inkLight, marginTop: 2 },
  reportResolveBtn: { backgroundColor: C.teal, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.full },
  reportResolveTxt: { fontSize: T.xs, fontWeight: '700', color: C.white },
  reportResolvedPill: { backgroundColor: C.foundBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.full },
  reportResolvedTxt:  { fontSize: T.xs, fontWeight: '700', color: C.found },

  // Solicitudes de adopción
  solicitudRow: {
    paddingVertical: S[14], borderBottomWidth: 1, borderBottomColor: C.borderLight, gap: 4,
  },
  solicitudName:  { fontSize: T.sm, fontWeight: '700', color: C.ink },
  solicitudArrow: { fontSize: T.xs, color: C.inkLight },
  solicitudQA:    { fontSize: T.xs, color: C.inkMid, lineHeight: 17, marginTop: 2 },
  solicitudBtns:  { flexDirection: 'row', gap: 8, marginTop: 10 },
  solicitudReject:  { flex: 1, paddingVertical: 10, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  solicitudRejectTxt: { fontSize: T.xs, fontWeight: '700', color: C.inkMid },
  solicitudApprove:  { flex: 1, paddingVertical: 10, borderRadius: R.lg, backgroundColor: C.found, alignItems: 'center' },
  solicitudApproveTxt: { fontSize: T.xs, fontWeight: '700', color: C.white },
});
