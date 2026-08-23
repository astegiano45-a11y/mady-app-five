// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · MapScreen v2 — Mapa real con Leaflet + OpenStreetMap
//  Semana 2: WebView + Leaflet, ubicación GPS, pins interactivos
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Image,
  ActivityIndicator, Animated, Platform, Linking, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeafletMap from '../components/LeafletMap';
import { getCurrentLocation, reverseGeocode } from '../services/LocationService';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import { createSighting, getSightingsForAlerta } from '../services/sightingsService';
import { alertCoords } from '../services/proximityService';

const FALLBACK_PINS = [
  { id:'f1', type:'lost',     name:'Mady',   emoji:'🐕', lat:-53.7873, lng:-67.7100, zone:'Barrio Centro', time:'2 h'    },
  { id:'f2', type:'found',    name:'?',      emoji:'🐾', lat:-53.8050, lng:-67.6950, zone:'Margen Sur',    time:'30 min' },
  { id:'f3', type:'adoption', name:'Nieve',  emoji:'❤️', lat:-53.7750, lng:-67.7300, zone:'Chacra XI',     time:'1 día'  },
];

const TYPE_INFO = {
  lost:     { label: 'Perdido',    color: '#DC2626', bg: '#FEF2F2' },
  found:    { label: 'Encontrado', color: '#16A34A', bg: '#F0FDF4' },
  adoption: { label: 'Adopción',   color: '#9333EA', bg: '#FAF5FF' },
};

// Tiempo relativo tipo "hace 5 min" / "hace 2 h" / "hace 3 días"
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'recién';
  if (diff < 60) return `hace ${diff} min`;
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
  return `hace ${Math.floor(diff / 1440)} días`;
}

// ── Card de detalle slide-up ──────────────────────────────────────────────────
function PinCard({ pin, onClose, onContact, onLoVi, reportingSighting, sightings = [], loadingSightings }) {
  if (!pin) return null;
  const t = TYPE_INFO[pin.type] || TYPE_INFO.lost;
  return (
    <View style={card.wrap}>
      <View style={card.header}>
        <View style={[card.badge, { backgroundColor: t.bg }]}>
          <Text style={[card.badgeText, { color: t.color }]}>{t.label.toUpperCase()}</Text>
        </View>
        <Pressable onPress={onClose} style={card.closeBtn}
          accessibilityRole="button" accessibilityLabel="Cerrar">
          <Text style={card.closeX}>✕</Text>
        </Pressable>
      </View>
      <View style={card.body}>
        <View style={[card.circle, { backgroundColor: t.color + '18' }]}>
          {pin.photo
            ? <Image source={{ uri: pin.photo }} style={{ width: 60, height: 60, borderRadius: 30 }} resizeMode="cover" />
            : <Text style={card.emoji}>{pin.emoji}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={card.name}>{pin.name}</Text>
          <Text style={card.zone}>📍 {pin.zone}</Text>
          <Text style={card.time}>🕐 Hace {pin.time}</Text>
        </View>
      </View>
      <View style={{ gap: SPACING.sm }}>
        <Pressable
          style={[card.btn, { backgroundColor: t.color }]}
          onPress={() => onContact(pin)}
          accessibilityRole="button"
          accessibilityLabel={`Contactar sobre ${pin.name}`}
        >
          <Text style={card.btnText}>
            {pin.type === 'lost' ? '📞 Lo vi — Contactar'
              : pin.type === 'found' ? '📞 Es mío — Contactar'
              : '❤️ Me interesa adoptar'}
          </Text>
        </Pressable>
        {pin.type === 'lost' && (
          <Pressable
            style={[card.btn, { backgroundColor: '#10B981', opacity: reportingSighting ? 0.6 : 1 }]}
            onPress={() => onLoVi(pin)}
            disabled={reportingSighting}
            accessibilityRole="button"
            accessibilityLabel={`Reportar avistamiento de ${pin.name}`}
          >
            <Text style={card.btnText}>
              {reportingSighting ? '⏳ Registrando...' : '👀 Lo vi aquí'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Avistamientos — más reciente primero (ya viene ordenado así del service) */}
      {pin.type === 'lost' && (
        <View style={card.sightingsWrap}>
          <Text style={card.sightingsTitle}>
            👀 Avistamientos {sightings.length > 0 ? `(${sightings.length})` : ''}
          </Text>
          {loadingSightings ? (
            <ActivityIndicator size="small" color="#6B7280" style={{ marginTop: 8 }} />
          ) : sightings.length === 0 ? (
            <Text style={card.sightingsEmpty}>Todavía nadie reportó haberlo visto.</Text>
          ) : (
            <ScrollView style={card.sightingsList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {sightings.map((s) => (
                <View key={s.id} style={card.sightingRow}>
                  <View style={card.sightingDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={card.sightingText}>{s.description || 'Avistamiento reportado'}</Text>
                    <Text style={card.sightingTime}>{timeAgo(s.created_at)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    padding: SPACING.lg, ...SHADOW.lg,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  closeBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeX:    { fontSize: 14, color: '#6B7280' },
  body:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  circle:    { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  emoji:     { fontSize: 30 },
  name:      { fontSize: FONTS.xl, fontWeight: '800', color: '#111827', fontFamily: 'Georgia' },
  zone:      { fontSize: FONTS.sm, color: '#6B7280', marginTop: 3 },
  time:      { fontSize: FONTS.xs, color: '#9CA3AF', marginTop: 4 },
  btn:       { borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', ...SHADOW.sm },
  btnText:   { fontSize: FONTS.base, fontWeight: '700', color: '#FFF' },

  // Avistamientos
  sightingsWrap:  { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sightingsTitle: { fontSize: FONTS.sm, fontWeight: '700', color: '#374151', marginBottom: 4 },
  sightingsEmpty: { fontSize: FONTS.xs, color: '#9CA3AF', marginTop: 4 },
  sightingsList:  { maxHeight: 140, marginTop: 4 },
  sightingRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  sightingDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginTop: 6 },
  sightingText:   { fontSize: FONTS.xs, color: '#374151', fontWeight: '500' },
  sightingTime:   { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
});

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState('Río Grande · TDF');
  const [loadingLoc,   setLoadingLoc]   = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [selectedPin,  setSelectedPin]  = useState(null);
  const [pins, setPins] = useState(FALLBACK_PINS);
  const [reportingSighting, setReportingSighting] = useState(false);
  const [sightingSuccess, setSightingSuccess] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [loadingSightings, setLoadingSightings] = useState(false);
  // Reemplazan Alert.alert en todo este screen: react-native-web (lo que
  // corre esta app en producción) implementa Alert.alert como un no-op
  // total -- "static alert() {}" -- así que cualquier Alert.alert acá no
  // mostraba nada en el navegador. contactInfo maneja el selector
  // WhatsApp/Llamar; infoMessage cubre los avisos de un solo botón
  // (sin teléfono, error, avistamiento registrado, etc.).
  const [contactInfo, setContactInfo] = useState(null);   // { petName, phone }
  const [infoMessage, setInfoMessage] = useState(null);   // { title, body }

  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    // GPS
    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          setUserLocation(loc);
          const name = await reverseGeocode(loc.lat, loc.lng);
          setLocationName(name);
        }
      } catch {}
      setLoadingLoc(false);
    })();

    // Cargar alertas reales de Supabase sin romper el mapa si falla
    try {
      const { supabase } = require('../lib/supabase');
      supabase.from('alertas').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50)
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          const realPins = data.map(a => {
            // Ubicación real de la alerta (lat/lng guardados al reportar) si existe;
            // si no, cae al centroide de la zona — mismo helper que usa proximityService,
            // así ambos coinciden en qué se considera "ubicación" de una alerta.
            const hasRealCoords = typeof a.lat === 'number' && typeof a.lng === 'number';
            const base = alertCoords(a);
            // El jitter (± ~300m) solo tiene sentido para el fallback aproximado de
            // zona, para que no se apilen todos los pines en el mismo punto exacto.
            // Con ubicación real no se jitterea: sería introducir imprecisión falsa
            // sobre un dato que ya es preciso.
            const coords = hasRealCoords
              ? base
              : { lat: base.lat + (Math.random() - 0.5) * 0.006, lng: base.lng + (Math.random() - 0.5) * 0.006 };
            const diff = Math.floor((Date.now() - new Date(a.created_at)) / 60000);
            const time = diff < 60 ? `${diff} min` : diff < 1440 ? `${Math.floor(diff/60)} h` : `${Math.floor(diff/1440)} días`;
            return {
              id: a.id, type: a.type || 'lost', name: a.name || '?',
              emoji: a.type === 'found' ? '🐾' : a.type === 'adoption' ? '❤️' : '🐕',
              lat: coords.lat,
              lng: coords.lng,
              exactLocation: hasRealCoords,
              zone: a.zone, time, photo: a.photo_url,
              user_id: a.user_id, // quién reportó — necesario para "Lo vi — Contactar"
            };
          });
          setPins(realPins);
        })
        .catch(() => {});
    } catch {}
  }, []);

  const filteredPins = filter === 'all' ? pins : pins.filter(p => p.type === filter);
  const FILTERS = [
    { key: 'all',      label: 'Todos',       count: pins.length },
    { key: 'lost',     label: '🔴 Perdidos', count: pins.filter(p=>p.type==='lost').length },
    { key: 'found',    label: '🟢 Encontr.', count: pins.filter(p=>p.type==='found').length },
    { key: 'adoption', label: '🟣 Adopción', count: pins.filter(p=>p.type==='adoption').length },
  ];

  const center = userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng }
    : { lat: -53.7873, lng: -67.7100 };

  // Carga los avistamientos de una alerta (más reciente primero — ya viene
  // ordenado así de getSightingsForAlerta) y los deja en el estado del card.
  const loadSightings = useCallback(async (alertaId) => {
    setLoadingSightings(true);
    try {
      const data = await getSightingsForAlerta(alertaId);
      setSightings(data);
    } finally {
      setLoadingSightings(false);
    }
  }, []);

  const showCard = useCallback((pin) => {
    setSelectedPin(pin);
    setSightings([]);
    if (pin.type === 'lost') loadSightings(pin.id);
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  }, [slideAnim, loadSightings]);

  const hideCard = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(
      () => setSelectedPin(null)
    );
  }, [slideAnim]);

  // Contacto real: el teléfono vive en profiles.phone, pero la única política
  // RLS de "profiles" es "auth.uid() = id" — nadie puede leer el perfil de
  // otro usuario directo. get_alerta_contact() es una función security
  // definer (ver supabase/contacto_alertas.sql) que expone solo name+phone
  // de quien reportó esa alerta puntual, sin abrir el resto de su perfil.
  const handleContact = useCallback(async (pin) => {
    if (!pin.user_id) {
      setInfoMessage({ title: 'Contacto no disponible', body: 'No pudimos encontrar el contacto de quien reportó esta mascota.' });
      return;
    }
    try {
      const { supabase } = require('../lib/supabase');
      const { data, error } = await supabase
        .rpc('get_alerta_contact', { alerta_id: pin.id })
        .single();

      const phone = data?.phone?.trim();
      if (error || !phone) {
        setInfoMessage({
          title: 'Sin teléfono de contacto',
          body: `${data?.name ? `${data.name} (quien reportó a ${pin.name})` : `Quien reportó a ${pin.name}`} no cargó un teléfono de contacto todavía.`,
        });
        return;
      }

      setContactInfo({ petName: pin.name, phone });
    } catch (e) {
      setInfoMessage({ title: 'Error', body: 'No pudimos obtener el contacto. Intentá de nuevo.' });
    }
  }, []);

  const handleLoVi = useCallback(async (pin) => {
    if (reportingSighting) return;
    setReportingSighting(true);
    try {
      const myLoc = await getCurrentLocation();
      if (!myLoc) {
        setInfoMessage({ title: 'Ubicación', body: 'No pudimos obtener tu ubicación. Verificá los permisos.' });
        setReportingSighting(false);
        return;
      }
      await createSighting(pin.id, myLoc.lat, myLoc.lng, `Visto cerca de ${pin.zone}`);
      setSightingSuccess(true);
      setTimeout(() => setSightingSuccess(false), 3000);
      await loadSightings(pin.id); // refresca la lista — el nuevo avistamiento aparece al toque
      setInfoMessage({ title: '✅ Avistamiento registrado', body: `¡Gracias! Tu reporte ayuda al dueño a encontrar a ${pin.name}.` });
    } catch (err) {
      setInfoMessage({ title: 'Error', body: 'No pudimos registrar el avistamiento. Intenta de nuevo.' });
    } finally {
      setReportingSighting(false);
    }
  }, [reportingSighting, loadSightings]);

  const lostCount = pins.filter(p => p.type === 'lost').length;

  return (
    <View style={[scr.screen, { paddingTop: insets.top }]}>

      {/* ── Modal contactar: WhatsApp / Llamar ── */}
      <Modal visible={!!contactInfo} transparent animationType="fade" onRequestClose={() => setContactInfo(null)}>
        <Pressable style={scr.modalBackdrop} onPress={() => setContactInfo(null)}>
          <Pressable style={scr.modalBox} onPress={() => {}}>
            <Text style={scr.modalTitle}>Contactar sobre {contactInfo?.petName}</Text>
            <Text style={scr.modalSub}>Teléfono: {contactInfo?.phone}</Text>
            <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable
                style={[scr.modalBtn, { backgroundColor: '#25D366' }]}
                onPress={() => { Linking.openURL(`https://wa.me/${contactInfo.phone.replace(/\D/g, '')}`); setContactInfo(null); }}
              >
                <Text style={scr.modalBtnText}>📱 WhatsApp</Text>
              </Pressable>
              <Pressable
                style={[scr.modalBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => { Linking.openURL(`tel:${contactInfo.phone}`); setContactInfo(null); }}
              >
                <Text style={scr.modalBtnText}>📞 Llamar</Text>
              </Pressable>
              <Pressable style={scr.modalCancelBtn} onPress={() => setContactInfo(null)}>
                <Text style={scr.modalCancelTxt}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal informativo (sin teléfono, error, avistamiento registrado, etc.) ── */}
      <Modal visible={!!infoMessage} transparent animationType="fade" onRequestClose={() => setInfoMessage(null)}>
        <Pressable style={scr.modalBackdrop} onPress={() => setInfoMessage(null)}>
          <Pressable style={scr.modalBox} onPress={() => {}}>
            <Text style={scr.modalTitle}>{infoMessage?.title}</Text>
            <Text style={scr.modalSub}>{infoMessage?.body}</Text>
            <Pressable style={[scr.modalBtn, { backgroundColor: '#5B4FFF', marginTop: SPACING.md }]} onPress={() => setInfoMessage(null)}>
              <Text style={scr.modalBtnText}>Entendido</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ── */}
      <View style={scr.header}>
        <View>
          <Text style={scr.title}>Mapa</Text>
          <View style={scr.locRow}>
            <Text style={scr.locIcon}>📍</Text>
            <Text style={scr.locText} numberOfLines={1}>
              {loadingLoc ? 'Localizando...' : locationName}
            </Text>
            {loadingLoc && <ActivityIndicator size="small" color="#5B4FFF" style={{ marginLeft: 4 }} />}
          </View>
        </View>
        <View style={scr.alertPill}>
          <View style={scr.alertDot} />
          <Text style={scr.alertText}>{lostCount} alertas cerca</Text>
        </View>
      </View>

      {/* ── Filtros ── */}
      <View style={scr.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scr.filterRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              style={[scr.chip, filter === f.key && scr.chipOn]}
              onPress={() => setFilter(f.key)}
              accessibilityRole="radio"
              accessibilityLabel={`${f.label}: ${f.count}`}
              accessibilityState={{ checked: filter === f.key }}
            >
              <Text style={[scr.chipText, filter === f.key && scr.chipTextOn]}>
                {f.label} · {f.count}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Mapa Leaflet (mapa real) ── */}
      <LeafletMap
        pins={filteredPins}
        userLocation={userLocation}
        centerLat={center.lat}
        centerLng={center.lng}
        zoom={13}
        onPinContact={showCard}
        style={{ flex: 1 }}
      />

      {/* ── Leyenda ── */}
      <View style={scr.legend}>
        {[
          { color: '#DC2626', label: 'Perdido' },
          { color: '#16A34A', label: 'Encontrado' },
          { color: '#9333EA', label: 'Adopción' },
          { color: '#5B4FFF', label: 'Tú' },
        ].map(l => (
          <View key={l.label} style={scr.legendItem}>
            <View style={[scr.legendDot, { backgroundColor: l.color }]} />
            <Text style={scr.legendLabel}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Card de detalle slide-up ── */}
      {selectedPin && (
        <Animated.View style={[scr.cardSlot, { transform: [{ translateY: slideAnim }] }]}>
          <PinCard
            pin={selectedPin}
            onClose={hideCard}
            onContact={handleContact}
            onLoVi={handleLoVi}
            reportingSighting={reportingSighting}
            sightings={sightings}
            loadingSightings={loadingSightings}
          />
        </Animated.View>
      )}

      {/* ── FAB Reportar ── */}
      <Pressable
        style={scr.fab}
        onPress={() => navigation.navigate('Reportar')}
        accessibilityRole="button"
        accessibilityLabel="Reportar una mascota"
      >
        <Text style={scr.fabIcon}>＋</Text>
        <Text style={scr.fabLabel}>Reportar</Text>
      </Pressable>
    </View>
  );
}

const scr = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF2F7' },

  // Modales (contactar / avisos) — ver comentario junto a contactInfo/infoMessage
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBox:       { backgroundColor: '#FFF', borderRadius: RADIUS.xl, padding: SPACING.lg, width: '100%', maxWidth: 320, ...SHADOW.lg },
  modalTitle:     { fontSize: FONTS.lg, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  modalSub:       { fontSize: FONTS.sm, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  modalBtn:       { borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  modalBtnText:   { fontSize: FONTS.base, fontWeight: '700', color: '#FFF' },
  modalCancelBtn: { paddingVertical: SPACING.sm, alignItems: 'center' },
  modalCancelTxt: { fontSize: FONTS.sm, fontWeight: '600', color: '#6B7280' },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  title:     { fontSize: FONTS['2xl'], fontWeight: '800', color: '#111827' },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locIcon:   { fontSize: 12 },
  locText:   { fontSize: FONTS.xs, color: '#6B7280', maxWidth: 240 },
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, marginBottom: 4,
  },
  alertDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626' },
  alertText: { fontSize: FONTS.xs, color: '#DC2626', fontWeight: '700' },

  filterBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFF',
  },
  chipOn:      { backgroundColor: '#5B4FFF', borderColor: '#3D31E0' },
  chipText:    { fontSize: FONTS.xs, color: '#6B7280', fontWeight: '600' },
  chipTextOn:  { color: '#FFF' },

  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg,
    paddingVertical: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: FONTS.xs, color: '#6B7280', fontWeight: '500' },

  cardSlot: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl + 8,
  },

  fab: {
    position: 'absolute', bottom: SPACING.xl + 60, right: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#DC2626', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  fabIcon:  { fontSize: 20, color: '#FFF', fontWeight: '800' },
  fabLabel: { fontSize: FONTS.base, fontWeight: '700', color: '#FFF' },
});
