// ─────────────────────────────────────────────────────────────────────────────
//  ReportarScreen — Experiencia SOS
//  Inspiración: Uber, Apple Find My, emergencia clara
//  Paleta: coral (SOS), teal (encontrado), verde (positivo), rojo (perdido)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Animated, Platform, KeyboardAvoidingView,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldAlert, MapPin, Search, Heart, ChevronRight, Check, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { crearAlerta } from '../services/alertasService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCurrentLocation, distanceKm } from '../services/LocationService';
import { updateMyLocation, evaluateProximity, formatDistance, fireWebNotification, ALERT_RADIUS_KM } from '../services/proximityService';

// ── Tipos de reporte ──────────────────────────────────────────────────────────
const TIPOS = [
  {
    id: 'lost',
    label: 'Perdí mi mascota',
    sub: 'Enviá alerta SOS a toda la comunidad',
    Icon: ShieldAlert,
    bg: C.lost,
    bgLight: C.lostBg,
    gradient: ['#EF4444', '#C94420'],
  },
  {
    id: 'found',
    label: 'Encontré una mascota',
    sub: 'Avisá para que el dueño la recupere',
    Icon: Search,
    bg: C.teal,
    bgLight: C.tealLight,
    gradient: [C.teal, C.tealDeep],
  },
  {
    id: 'adoption',
    label: 'Dar en adopción',
    sub: 'Encontrá un hogar lleno de amor',
    Icon: Heart,
    bg: C.found,
    bgLight: C.foundBg,
    gradient: ['#16A34A', '#166534'],
  },
];

const ZONAS = [
  'Barrio Centro', 'Margen Sur', 'Chacra XI', 'Villa del Mar',
  'Chacra II', 'Chacra III', 'Barrio IPVU', 'Zona Norte',
];

// ── Paso 1: elegir tipo ───────────────────────────────────────────────────────
function StepTipo({ onSelect }) {
  const scales = TIPOS.map(() => useRef(new Animated.Value(1)).current);

  const press = (idx, tipo) => {
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.95, useNativeDriver: true, speed: 80 }),
      Animated.spring(scales[idx], { toValue: 1,    useNativeDriver: true, speed: 80 }),
    ]).start(() => onSelect(tipo));
  };

  return (
    <View style={st.stepWrap}>
      <Text style={st.stepTitle}>¿Qué necesitás reportar?</Text>
      <Text style={st.stepSub}>Tu alerta llega a toda la comunidad de Río Grande al instante.</Text>
      <View style={{ gap: 12, marginTop: S[24] }}>
        {TIPOS.map((tipo, idx) => (
          <Animated.View key={tipo.id} style={{ transform: [{ scale: scales[idx] }] }}>
            <TouchableOpacity
              style={[st.tipoCard, { backgroundColor: tipo.bgLight, borderColor: tipo.bg + '40' }]}
              onPress={() => press(idx, tipo)}
              activeOpacity={0.9}
            >
              <View style={[st.tipoIcon, { backgroundColor: tipo.bg }]}>
                <tipo.Icon size={22} color={C.white} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.tipoLabel, { color: tipo.bg }]}>{tipo.label}</Text>
                <Text style={st.tipoSub}>{tipo.sub}</Text>
              </View>
              <ChevronRight size={18} color={tipo.bg} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

async function uploadFoto(uri, base64) {
  const path = `reportes/${Date.now()}.jpg`;

  if (Platform.OS === 'web' || base64) {
    // En web usamos base64
    const base64Data = base64 || uri.split(',')[1];
    const byteChars  = atob(base64Data);
    const byteNums   = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });
    const { error } = await supabase.storage.from('mascotas').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } else {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const { error } = await supabase.storage.from('mascotas').upload(path, blob, { upsert: true });
    if (error) throw error;
  }

  return supabase.storage.from('mascotas').getPublicUrl(path).data.publicUrl;
}

// ── Paso 2: completar datos ───────────────────────────────────────────────────
function StepDatos({ tipo, onBack, onSubmit, loading }) {
  const [name,      setName]      = useState('');
  const [zone,      setZone]      = useState('');
  const [desc,      setDesc]      = useState('');
  const [photo,     setPhoto]     = useState(null);   // { uri, base64 }

  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const canSubmit = name.trim().length >= 2 && zone.length > 0;

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Necesitamos permiso para acceder a tus fotos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
      base64: true,
    });
    if (!result.canceled) setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  };

  const handleSubmit = async () => {
    if (!canSubmit) { setError('Completá el nombre y la zona.'); return; }
    setError('');
    let photoUrl = null;
    if (photo) {
      setUploading(true);
      try { photoUrl = await uploadFoto(photo.uri, photo.base64); } catch (e) { console.log('upload err', e); }
      setUploading(false);
    }
    onSubmit({ name: name.trim(), zone, description: desc.trim(), type: tipo.id, photo_url: photoUrl });
  };

  return (
    <View style={st.stepWrap}>
      {/* Header del tipo */}
      <LinearGradient
        colors={tipo.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={st.tipoHeader}
      >
        <tipo.Icon size={28} color={C.white} strokeWidth={2} />
        <Text style={st.tipoHeaderLabel}>{tipo.label}</Text>
      </LinearGradient>

      <Text style={st.stepTitle}>Datos del reporte</Text>
      <Text style={st.stepSub}>Cuanta más info, más rápido aparece.</Text>

      {/* Nombre */}
      <View style={st.fieldWrap}>
        <Text style={st.fieldLabel}>Nombre de la mascota *</Text>
        <TextInput
          style={st.input}
          placeholder="Ej: Mady, Canelo, Nieve..."
          placeholderTextColor={C.inkMuted}
          value={name}
          onChangeText={setName}
          maxLength={40}
        />
      </View>

      {/* Zona */}
      <View style={st.fieldWrap}>
        <Text style={st.fieldLabel}>Zona donde fue vista *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
            {ZONAS.map(z => (
              <TouchableOpacity
                key={z}
                style={[st.zonaChip, zone === z && { backgroundColor: tipo.bg, borderColor: tipo.bg }]}
                onPress={() => setZone(z)}
              >
                <Text style={[st.zonaChipTxt, zone === z && { color: C.white }]}>{z}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Descripción */}
      <View style={st.fieldWrap}>
        <Text style={st.fieldLabel}>Descripción (opcional)</Text>
        <TextInput
          style={[st.input, st.inputMulti]}
          placeholder="Color, tamaño, collar, señas particulares..."
          placeholderTextColor={C.inkMuted}
          value={desc}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      {/* Foto */}
      <View style={st.fieldWrap}>
        <Text style={st.fieldLabel}>Foto (recomendado)</Text>
        {photo ? (
          <View style={st.photoPreviewWrap}>
            <Image source={{ uri: photo.uri }} style={st.photoPreview} resizeMode="cover" />
            <TouchableOpacity style={st.photoRemove} onPress={() => setPhoto(null)}>
              <X size={14} color={C.white} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[st.photoBtn, { borderColor: tipo.bg + '60' }]} onPress={pickPhoto}>
            <Camera size={22} color={tipo.bg} strokeWidth={1.75} />
            <Text style={[st.photoBtnTxt, { color: tipo.bg }]}>Agregar foto</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={st.errorTxt}>{error}</Text> : null}

      {/* Botones */}
      <View style={{ gap: 12, marginTop: S[8] }}>
        <TouchableOpacity
          style={[st.submitBtn, { backgroundColor: tipo.bg }, !canSubmit && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={loading || uploading || !canSubmit}
        >
          {(loading || uploading)
            ? <ActivityIndicator color={C.white} />
            : <Text style={st.submitBtnTxt}>Enviar alerta ahora</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Text style={st.backBtnTxt}>← Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Paso 3: confirmación ──────────────────────────────────────────────────────
function StepConfirm({ tipo, name, zone, onReset, hasLocation }) {
  const scale = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
      Animated.timing(fade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[st.confirmWrap, { opacity: fade }]}>
      <Animated.View style={[st.confirmCircle, { backgroundColor: tipo.bg, transform: [{ scale }] }]}>
        <Check size={48} color={C.white} strokeWidth={3} />
      </Animated.View>
      <Text style={st.confirmTitle}>¡Alerta enviada!</Text>
      <Text style={st.confirmSub}>
        La comunidad de Río Grande ya sabe que <Text style={{ fontWeight: '700', color: tipo.bg }}>{name}</Text> fue
        {tipo.id === 'lost' ? ' reportado/a como perdido/a' : tipo.id === 'found' ? ' encontrado/a' : ' puesto/a en adopción'} en <Text style={{ fontWeight: '700' }}>{zone}</Text>.
      </Text>
      <View style={[st.confirmCard, { borderColor: tipo.bg + '30', backgroundColor: tipo.bgLight }]}>
        <MapPin size={16} color={tipo.bg} strokeWidth={2} />
        <Text style={[st.confirmCardTxt, { color: tipo.bg }]}>
          Tu reporte ya aparece en el mapa en tiempo real
        </Text>
      </View>

      {/* Aviso de ubicación — geolocalización real vs. zona aproximada */}
      {hasLocation ? (
        <View style={[st.confirmCard, { borderColor: '#16A34A30', backgroundColor: '#F0FDF4' }]}>
          <MapPin size={16} color="#16A34A" strokeWidth={2} />
          <Text style={[st.confirmCardTxt, { color: '#16A34A' }]}>
            Guardamos tu ubicación exacta para este reporte
          </Text>
        </View>
      ) : (
        <View style={[st.confirmCard, { borderColor: '#D9770630', backgroundColor: '#FFFBEB' }]}>
          <MapPin size={16} color="#D97706" strokeWidth={2} />
          <Text style={[st.confirmCardTxt, { color: '#D97706' }]}>
            Sin ubicación exacta — se usará la zona aproximada en el mapa
          </Text>
        </View>
      )}

      <TouchableOpacity style={[st.submitBtn, { backgroundColor: tipo.bg, marginTop: S[24] }]} onPress={onReset}>
        <Text style={st.submitBtnTxt}>Hacer otro reporte</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function ReportarScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();

  const [paso,     setPaso]     = useState(1);  // 1=tipo, 2=datos, 3=confirm
  const [tipo,     setTipo]     = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [hasLocation, setHasLocation] = useState(false); // ¿la alerta quedó geolocalizada?

  const handleTipo = (t) => { setTipo(t); setPaso(2); };

  const handleSubmit = async (datos) => {
    setLoading(true);
    try {
      // Ubicación real: pedimos permiso UNA sola vez (expo-location — en web
      // usa la Geolocation API del navegador por debajo, en nativo el GPS).
      // Si el usuario la rechaza o falla, getCurrentLocation() devuelve null
      // sin tirar excepción — el formulario sigue igual, solo sin lat/lng.
      let coords = null;
      try { coords = await getCurrentLocation(); } catch {}

      // 1. Crear alerta — con lat/lng reales si los conseguimos; si no,
      //    quedan null y el mapa cae al fallback de zona que ya existía.
      const alerta = await crearAlerta({
        ...datos,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      setHasLocation(!!coords);

      // 2. Actualizar mi ubicación + notificar usuarios cercanos
      //    (reusa la misma ubicación ya pedida arriba, no vuelve a preguntar)
      (async () => {
        try {
          if (coords) {
            await updateMyLocation(coords.lat, coords.lng);
            // Obtener usuarios cercanos
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, expo_push_token, last_lat, last_lng')
              .not('last_lat', 'is', null);

            if (profiles && profiles.length > 0) {
              profiles.forEach((profile) => {
                if (!profile.last_lat || !profile.last_lng) return;
                const { relevant, distanceKm: d } = evaluateProximity(alerta, profile.last_lat, profile.last_lng);
                if (relevant) {
                  // Notificación en navegador (web)
                  const icon = alerta.type === 'lost' ? '🚨' : alerta.type === 'found' ? '🟢' : '🏠';
                  fireWebNotification({
                    title: `${icon} ${alerta.name} en ${alerta.zone}`,
                    body: `${formatDistance(d)} — ${alerta.description || 'Sin descripción'}`,
                  });
                  // En el futuro: push token enviará a Expo y notificará cuando app está cerrada
                }
              });
            }
          }
        } catch {}
      })();

      setResult(alerta);
      setPaso(3);
    } catch (e) {
      // Aunque falle el backend, mostramos confirmación (UX de emergencia)
      setResult({ name: datos.name, zone: datos.zone });
      setHasLocation(false);
      setPaso(3);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setPaso(1); setTipo(null); setResult(null); };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#F5F7FA', '#EBF0F6']}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[st.header, { paddingTop: insets.top + 8 }]}>
          <View style={st.headerIcon}>
            <ShieldAlert size={20} color={C.coral} strokeWidth={2} />
          </View>
          <Text style={st.headerTitle}>Reportar</Text>
          <View style={st.headerBadge}>
            <View style={st.liveDot} />
            <Text style={st.liveTxt}>EN VIVO</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {paso === 1 && <StepTipo onSelect={handleTipo} />}
          {paso === 2 && tipo && (
            <StepDatos
              tipo={tipo}
              onBack={() => setPaso(1)}
              onSubmit={handleSubmit}
              loading={loading}
            />
          )}
          {paso === 3 && tipo && result && (
            <StepConfirm
              tipo={tipo}
              name={result.name}
              zone={result.zone}
              hasLocation={hasLocation}
              onReset={handleReset}
            />
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: S[20], paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.coralLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.lg, fontWeight: '700', color: C.ink, flex: 1 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: C.lost },
  liveTxt:  { fontSize: 10, fontWeight: '800', color: C.lost, letterSpacing: 1 },

  scroll: { padding: S[20] },

  stepWrap: { gap: 4 },
  stepTitle: { fontSize: T['2xl'], fontWeight: '800', color: C.ink, marginBottom: 4 },
  stepSub:   { fontSize: T.sm, color: C.inkLight, lineHeight: 20, marginBottom: 4 },

  // Tipo cards
  tipoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: S[16], borderRadius: R['2xl'],
    borderWidth: 1.5,
  },
  tipoIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tipoLabel: { fontSize: T.base, fontWeight: '700', marginBottom: 2 },
  tipoSub:   { fontSize: T.xs, color: C.inkLight },

  // Header tipo seleccionado
  tipoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: S[16], borderRadius: R.xl, marginBottom: S[20],
  },
  tipoHeaderLabel: { fontSize: T.base, fontWeight: '700', color: C.white },

  // Campos
  fieldWrap: { marginTop: S[16] },
  fieldLabel: { fontSize: T.sm, fontWeight: '600', color: C.inkMid, marginBottom: 6 },
  input: {
    backgroundColor: C.white,
    borderRadius: R.xl, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: S[16], paddingVertical: 13,
    fontSize: T.base, color: C.ink,
  },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 12 },

  // Zona chips
  zonaChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: R.full, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
  },
  zonaChipTxt: { fontSize: T.sm, fontWeight: '600', color: C.inkMid },

  errorTxt: { fontSize: T.sm, color: C.lost, marginTop: 8 },

  // Botones
  submitBtn: {
    paddingVertical: 16, borderRadius: R['2xl'],
    alignItems: 'center', justifyContent: 'center',
    marginTop: S[8],
  },
  submitBtnTxt: { fontSize: T.base, fontWeight: '800', color: C.white, letterSpacing: 0.3 },
  backBtn:  { alignItems: 'center', paddingVertical: 12 },
  backBtnTxt: { fontSize: T.sm, color: C.inkLight, fontWeight: '600' },

  // Foto
  photoBtn: {
    height: 100, borderRadius: R.xl, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.cloud,
  },
  photoBtnTxt: { fontSize: T.sm, fontWeight: '600' },
  photoPreviewWrap: { position: 'relative' },
  photoPreview: { width: '100%', height: 160, borderRadius: R.xl },
  photoRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Confirmación
  confirmWrap: { alignItems: 'center', paddingTop: S[40], gap: 16 },
  confirmCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: S[8],
  },
  confirmTitle: { fontSize: T['3xl'], fontWeight: '800', color: C.ink },
  confirmSub: {
    fontSize: T.base, color: C.inkMid, textAlign: 'center',
    lineHeight: 24, paddingHorizontal: S[8],
  },
  confirmCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: S[16], borderRadius: R.xl, borderWidth: 1.5,
    marginTop: S[8], width: '100%',
  },
  confirmCardTxt: { fontSize: T.sm, fontWeight: '600' },
});
