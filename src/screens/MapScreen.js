// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · MapScreen v2 — Mapa real con Leaflet + OpenStreetMap
//  Semana 2: WebView + Leaflet, ubicación GPS, pins interactivos
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Image,
  ActivityIndicator, Animated, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeafletMap from '../components/LeafletMap';
import { getCurrentLocation, reverseGeocode } from '../services/LocationService';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import { createSighting } from '../services/sightingsService';

// Coordenadas reales de Río Grande, TDF
const ZONE_COORDS = {
  'Barrio Centro':  { lat: -53.7873, lng: -67.7100 },
  'Margen Sur':     { lat: -53.8050, lng: -67.6950 },
  'Chacra XI':      { lat: -53.7750, lng: -67.7300 },
  'Villa del Mar':  { lat: -53.7650, lng: -67.6800 },
  'Chacra II':      { lat: -53.7920, lng: -67.7250 },
  'Chacra III':     { lat: -53.7830, lng: -67.7400 },
  'Barrio IPVU':    { lat: -53.7700, lng: -67.7150 },
  'Zona Norte':     { lat: -53.7600, lng: -67.7050 },
};

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

// ── Card de detalle slide-up ──────────────────────────────────────────────────
function PinCard({ pin, onClose, onContact, onLoVi, reportingSighting }) {
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
  const [contactModal, setContactModal] = useState(null);

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
            const coords = ZONE_COORDS[a.zone] || { lat: -53.7873, lng: -67.7100 };
            const diff = Math.floor((Date.now() - new Date(a.created_at)) / 60000);
            const time = diff < 60 ? `${diff} min` : diff < 1440 ? `${Math.floor(diff/60)} h` : `${Math.floor(diff/1440)} días`;
            return {
              id: a.id, type: a.type || 'lost', name: a.name || '?',
              emoji: a.type === 'found' ? '🐾' : a.type === 'adoption' ? '❤️' : '🐕',
              lat: coords.lat + (Math.random() - 0.5) * 0.006,
              lng: coords.lng + (Math.random() - 0.5) * 0.006,
              zone: a.zone, time, photo: a.photo_url,
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

  const showCard = useCallback((pin) => {
    setSelectedPin(pin);
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  }, [slideAnim]);

  const hideCard = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(
      () => setSelectedPin(null)
    );
  }, [slideAnim]);

  const handleContact = useCallback((pin) => {
    setContactModal(pin);
  }, []);

  const handleLoVi = useCallback(async (pin) => {
    if (reportingSighting) return;
    setReportingSighting(true);
    try {
      const myLoc = await getCurrentLocation();
      if (!myLoc) {
        Alert.alert('Ubicación', 'No pudimos obtener tu ubicación. Verificá los permisos.');
        setReportingSighting(false);
        return;
      }
      await createSighting(pin.id, myLoc.lat, myLoc.lng, `Visto cerca de ${pin.zone}`);
      setSightingSuccess(true);
      setTimeout(() => setSightingSuccess(false), 3000);
      Alert.alert('✅ Avistamiento registrado', `¡Gracias! Tu reporte ayuda al dueño a encontrar a ${pin.name}.`);
    } catch (err) {
      Alert.alert('Error', 'No pudimos registrar el avistamiento. Intenta de nuevo.');
    } finally {
      setReportingSighting(false);
    }
  }, [reportingSighting]);

  const lostCount = pins.filter(p => p.type === 'lost').length;

  return (
    <View style={[scr.screen, { paddingTop: insets.top }]}>

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
          <PinCard pin={selectedPin} onClose={hideCard} onContact={handleContact} onLoVi={handleLoVi} reportingSighting={reportingSighting} />
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

      {/* ── Modal de contacto ── */}
      {contactModal && (
        <Pressable
          style={scr.modalBackdrop}
          onPress={() => setContactModal(null)}
          accessibilityRole="button"
        >
          <Pressable style={scr.modalBox} onPress={() => {}}>
            <Pressable style={scr.modalClose} onPress={() => setContactModal(null)}>
              <Text style={scr.modalCloseX}>✕</Text>
            </Pressable>
            <View style={[scr.modalCircle, { backgroundColor: TYPE_INFO[contactModal.type]?.color + '15' }]}>
              {contactModal.photo
                ? <Image source={{ uri: contactModal.photo }} style={{ width: 70, height: 70, borderRadius: 35 }} resizeMode="cover" />
                : <Text style={scr.modalEmoji}>{TYPE_INFO[contactModal.type]?.label === 'PERDIDO' ? '🐕' : '🐾'}</Text>
              }
            </View>
            <Text style={scr.modalName}>{contactModal.name}</Text>
            <View style={scr.modalInfo}>
              <Text style={scr.modalInfoTxt}>📍 {contactModal.zone}</Text>
              <Text style={scr.modalInfoTxt}>📋 {TYPE_INFO[contactModal.type]?.label}</Text>
              <Text style={scr.modalInfoTxt}>🕐 Visto hace {contactModal.time}</Text>
            </View>
            <Pressable style={scr.modalBtn} onPress={() => { setContactModal(null); Alert.alert('Próximamente', 'Chat para contactar al dueño — Disponible en v3'); }}>
              <Text style={scr.modalBtnTxt}>💬 Enviar mensaje</Text>
            </Pressable>
            <Pressable style={scr.modalBtnSecond} onPress={() => setContactModal(null)}>
              <Text style={scr.modalBtnSecondTxt}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const scr = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF2F7' },

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

  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
  },
  modalBox: {
    width: '85%', maxWidth: 320, backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', ...SHADOW.lg,
  },
  modalClose: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseX: { fontSize: 16, color: '#6B7280', fontWeight: '700' },
  modalCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  modalEmoji: { fontSize: 44 },
  modalName: { fontSize: FONTS.xl, fontWeight: '800', color: '#111827', marginBottom: SPACING.sm },
  modalInfo: { width: '100%', gap: SPACING.xs, marginBottom: SPACING.lg, backgroundColor: '#F9FAFB', padding: SPACING.md, borderRadius: RADIUS.lg },
  modalInfoTxt: { fontSize: FONTS.sm, color: '#6B7280', fontWeight: '500' },
  modalBtn: {
    width: '100%', backgroundColor: '#DC2626', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, alignItems: 'center', marginBottom: SPACING.sm,
  },
  modalBtnTxt: { fontSize: FONTS.base, fontWeight: '700', color: '#FFF' },
  modalBtnSecond: {
    width: '100%', backgroundColor: '#E5E7EB', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, alignItems: 'center',
  },
  modalBtnSecondTxt: { fontSize: FONTS.base, fontWeight: '600', color: '#6B7280' },
});
