// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · MapScreen v2 — Mapa real con Leaflet + OpenStreetMap
//  Semana 2: WebView + Leaflet, ubicación GPS, pins interactivos
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Image,
  ActivityIndicator, Animated, Platform, Linking, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeafletMap from '../components/LeafletMap';
import { getCurrentLocation, reverseGeocode, watchLocation } from '../services/LocationService';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import { getSightingsForAlerta, suscribirAvistamientos } from '../services/sightingsService';
import SightingCaptureModal from '../components/SightingCaptureModal';
import { alertCoords } from '../services/proximityService';
import { timeAgo, sightingPlaceLabel, sightingNote } from '../utils/sightings';
import { buildTrack } from '../utils/track';
import { youAreAtLabel, walkingDirectionsUrl, zoneLabel } from '../utils/geo';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { suscribirAlertas, resolverAlerta } from '../services/alertasService';
import { useAuth } from '../context/AuthContext';

// Ancho de la tarjeta de la mascota en pantallas anchas
const CARD_WIDE_WIDTH = 400;

// Desplazamiento fijo (± ~300 m) a partir del id, para alertas SIN ubicación
// exacta: que no se apilen todas en el centro de la zona. Antes era
// Math.random(), y al recargar en tiempo real los pines saltaban de lugar.
function stableJitter(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) | 0;
  const a = ((h & 0xffff) / 0xffff) - 0.5;
  const b = (((h >>> 16) & 0xffff) / 0xffff) - 0.5;
  return { dLat: a * 0.006, dLng: b * 0.006 };
}

// Fila de "alertas" → pin del mapa
function alertToPin(a) {
  // Ubicación real de la alerta (lat/lng guardados al reportar) si existe;
  // si no, cae al centroide de la zona — mismo helper que usa proximityService,
  // así ambos coinciden en qué se considera "ubicación" de una alerta.
  const hasRealCoords = typeof a.lat === 'number' && typeof a.lng === 'number';
  const base = alertCoords(a);
  // Con ubicación real no se desplaza: sería imprecisión falsa sobre un dato preciso.
  const j = hasRealCoords ? { dLat: 0, dLng: 0 } : stableJitter(a.id);
  const diff = Math.floor((Date.now() - new Date(a.created_at)) / 60000);
  const time = diff < 60 ? `${diff} min` : diff < 1440 ? `${Math.floor(diff/60)} h` : `${Math.floor(diff/1440)} días`;
  return {
    id: a.id, type: a.type || 'lost', name: a.name || '?',
    emoji: a.type === 'found' ? '🐾' : a.type === 'adoption' ? '❤️' : '🐕',
    lat: base.lat + j.dLat,
    lng: base.lng + j.dLng,
    exactLocation: hasRealCoords,
    zone: a.zone, time, photo: a.photo_url,
    user_id: a.user_id, // quién reportó — "Lo vi — Contactar" y botón del dueño
    createdAt: a.created_at, // zona de búsqueda cuando todavía no hay avistamientos
  };
}

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

// ── Modo rastreo: tarjeta chica abajo ─────────────────────────────────────────
// En el celular la tarjeta completa tapaba casi todo el mapa. En rastreo queda
// una barra compacta con lo esencial y el mapa (oscuro) ocupa el resto.
function TrackingBar({ pin, track, sightings, onExit, onLoVi, me, meError, target, onDirections }) {
  const last = track?.points?.filter((p) => p.kind === 'sighting').pop() || null;
  const sa = track?.searchArea;
  const photo = last?.photo || pin.photo;
  // "Estás a X m" hasta el último avistamiento (o donde se perdió), en vivo
  const youAre = youAreAtLabel(me, target);
  const where = last ? 'último avistamiento' : 'lugar donde se perdió';
  const meText = youAre === 'Estás acá'
    ? `Estás en el lugar del ${where}`
    : youAre ? `${youAre} del ${where}`
    : meError === 'permiso' ? 'Activá el permiso de ubicación para ver a qué distancia estás'
    : meError === 'gps'     ? 'No pudimos obtener tu ubicación'
    : 'Buscando tu ubicación…';
  return (
    <View style={trk.wrap} accessibilityLabel={`Rastreando a ${pin.name}`}>
      <View style={trk.row}>
        {photo
          ? <Image source={{ uri: photo }} style={trk.thumb} resizeMode="cover" accessibilityLabel={`Foto de ${pin.name}`} />
          : <View style={[trk.thumb, trk.thumbEmpty]}><Text style={{ fontSize: 22 }}>{pin.emoji}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={trk.titleRow}>
            <View style={trk.liveDot} />
            <Text style={trk.kicker}>RASTREANDO</Text>
          </View>
          <Text style={trk.name} numberOfLines={1}>{pin.name}</Text>
          <Text style={trk.meta} numberOfLines={2}>
            {last
              ? `Visto ${last.timeLabel} · ${last.placeLabel.split(' · ')[0]}`
              : sightings.length === 0 ? 'Sin avistamientos todavía' : ''}
          </Text>
          {sa && (
            <Text style={trk.zone} numberOfLines={1}>
              Zona de búsqueda: {sa.radiusLabel}{sa.maxed ? ' (máximo)' : ''}
            </Text>
          )}
        </View>
        <Pressable onPress={onExit} style={trk.close} accessibilityRole="button" accessibilityLabel="Salir del modo rastreo">
          <Text style={trk.closeX}>✕</Text>
        </Pressable>
      </View>
      {/* Distancia en vivo; aria-live para que el lector de pantalla la anuncie */}
      <View style={trk.meRow} accessibilityLiveRegion="polite">
        <View style={[trk.meDot, !youAre && trk.meDotOff]} />
        <Text style={[trk.meText, youAre && trk.meTextOn]} numberOfLines={2}>{meText}</Text>
      </View>
      <View style={trk.btnRow}>
        <Pressable style={[trk.btn, trk.btnHalf]} onPress={() => onLoVi(pin)} accessibilityRole="button"
          accessibilityLabel={`Reportar avistamiento de ${pin.name} con una foto`}>
          <Text style={trk.btnText}>📷 Lo vi aquí</Text>
        </Pressable>
        <Pressable
          style={[trk.btn, trk.btnHalf, trk.btnRoute, !target && { opacity: 0.5 }]}
          onPress={() => target && onDirections(target)}
          disabled={!target}
          accessibilityRole="link"
          accessibilityLabel={`Cómo llegar a pie hasta el ${last ? 'último avistamiento' : 'lugar donde se perdió'} de ${pin.name}. Abre la app de mapas`}
        >
          <Text style={trk.btnText}>🧭 Cómo llegar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const trk = StyleSheet.create({
  wrap:       { backgroundColor: 'rgba(11,18,32,0.96)', borderRadius: RADIUS.xl, padding: SPACING.md,
                gap: SPACING.sm, borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)', ...SHADOW.lg },
  row:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  thumb:      { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#F43F5E' },
  thumbEmpty: { backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22D3EE' },
  kicker:     { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#67E8F9' },
  name:       { fontSize: FONTS.lg, fontWeight: '800', color: '#F9FAFB' },
  meta:       { fontSize: FONTS.xs, color: '#D1D5DB', marginTop: 1 },
  zone:       { fontSize: FONTS.xs, color: '#FCD34D', marginTop: 1, fontWeight: '600' },
  close:      { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  closeX:     { fontSize: 14, color: '#E5E7EB' },
  btn:        { backgroundColor: '#10B981', borderRadius: RADIUS.md, paddingVertical: SPACING.sm + 4, alignItems: 'center' },
  btnText:    { fontSize: FONTS.base, fontWeight: '700', color: '#FFF' },
  btnRow:     { flexDirection: 'row', gap: SPACING.sm },
  btnHalf:    { flex: 1 },
  btnRoute:   { backgroundColor: '#2563EB' },
  meRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  meDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#FFF' },
  meDotOff:   { backgroundColor: '#6B7280' },
  meText:     { flex: 1, fontSize: FONTS.sm, color: '#9CA3AF' },
  meTextOn:   { color: '#BFDBFE', fontWeight: '700' },
});

// ¿iPhone/iPad? (también en la web: Safari de iPadOS se presenta como Mac)
function isAppleDevice() {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// "Cómo llegar": ruta a pie en Apple Maps (iPhone) o Google Maps (resto)
function openWalkingDirections(target) {
  const url = walkingDirectionsUrl(target, { apple: isAppleDevice() });
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

// ── Card de detalle slide-up ──────────────────────────────────────────────────
function PinCard({ pin, onClose, onContact, onLoVi, onTrack, onFound, isOwner, sightings = [], loadingSightings }) {
  if (!pin) return null;
  const isLost = pin.type === 'lost';
  const t = TYPE_INFO[pin.type] || TYPE_INFO.lost;
  // Punto donde se perdió: solo si la alerta tiene coordenadas reales. Si cae
  // al centro aproximado de la zona (con jitter), la distancia sería inventada.
  const lostPoint = pin.exactLocation ? { lat: pin.lat, lng: pin.lng } : null;
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
        {/* Solo el dueño, solo si está perdida: marcarla como encontrada */}
        {isOwner && isLost && (
          <Pressable
            style={[card.btn, card.btnFound]}
            onPress={() => onFound(pin)}
            accessibilityRole="button"
            accessibilityLabel={`Ya encontré a ${pin.name}: marcar como resuelta`}
          >
            <Text style={card.btnFoundText}>🎉 ¡Ya lo encontré!</Text>
          </Pressable>
        )}
        {/* Contactar al dueño: no tiene sentido mostrárselo al propio dueño */}
        {!isOwner && (
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
        )}
        {isLost && (
          <View style={card.btnRow}>
            <Pressable
              style={[card.btn, card.btnHalf, { backgroundColor: '#10B981' }]}
              onPress={() => onLoVi(pin)}
              accessibilityRole="button"
              accessibilityLabel={`Reportar avistamiento de ${pin.name} con una foto`}
            >
              <Text style={card.btnText}>📷 Lo vi aquí</Text>
            </Pressable>
            <Pressable
              style={[card.btn, card.btnHalf, card.btnTrack]}
              onPress={() => onTrack(pin)}
              accessibilityRole="button"
              accessibilityLabel={`Rastrear a ${pin.name}: ver el recorrido y la zona de búsqueda en el mapa`}
            >
              <Text style={card.btnTrackText}>🛰️ Rastrear</Text>
            </Pressable>
          </View>
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
              {sightings.map((s) => {
                const note = sightingNote(s);
                return (
                  <View key={s.id} style={card.sightingRow}>
                    {s.photo_url
                      ? <Image source={{ uri: s.photo_url }} style={card.sightingThumb} resizeMode="cover"
                          accessibilityLabel="Foto del avistamiento" />
                      : <View style={card.sightingDot} />}
                    <View style={{ flex: 1 }}>
                      <Text style={card.sightingText}>{sightingPlaceLabel(s, lostPoint)}</Text>
                      {!!note && <Text style={card.sightingNote}>“{note}”</Text>}
                      <Text style={card.sightingTime}>{timeAgo(s.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
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
  btnRow:    { flexDirection: 'row', gap: SPACING.sm },
  btnHalf:   { flex: 1 },
  btnTrack:  { backgroundColor: '#0B1220', borderWidth: 1.5, borderColor: '#22D3EE' },
  btnTrackText: { fontSize: FONTS.base, fontWeight: '800', color: '#67E8F9' },
  btnFound:  { backgroundColor: '#15803D', paddingVertical: SPACING.md + 6 },
  btnFoundText: { fontSize: FONTS.lg, fontWeight: '800', color: '#FFF' },

  // Avistamientos
  sightingsWrap:  { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sightingsTitle: { fontSize: FONTS.sm, fontWeight: '700', color: '#374151', marginBottom: 4 },
  sightingsEmpty: { fontSize: FONTS.xs, color: '#9CA3AF', marginTop: 4 },
  sightingsList:  { maxHeight: 140, marginTop: 4 },
  sightingRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  sightingDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginTop: 6 },
  sightingThumb:  { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6' },
  sightingText:   { fontSize: FONTS.xs, color: '#374151', fontWeight: '500' },
  sightingNote:   { fontSize: FONTS.xs, color: '#6B7280', fontStyle: 'italic', marginTop: 1 },
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
  const [capturePin, setCapturePin] = useState(null); // mascota para la que se está cargando un avistamiento
  const [cardHeight, setCardHeight] = useState(0);
  const isDesktop = useIsDesktop();
  const { currentUser } = useAuth();
  const [tracking, setTracking] = useState(false);          // modo rastreo
  const [now, setNow] = useState(() => Date.now());          // reloj de la zona de búsqueda
  const [confirmFound, setConfirmFound] = useState(null);    // pin a marcar como encontrado
  const [resolving, setResolving] = useState(false);
  const [me, setMe] = useState(null);            // mi ubicación en vivo (modo rastreo)
  const [meError, setMeError] = useState(null);  // 'permiso' | 'gps' | null

  // Modo rastreo: seguir mi ubicación en vivo mientras dura, y dejar de
  // seguirla al salir (no gastar batería ni GPS fuera del rastreo).
  useEffect(() => {
    if (!tracking) { setMe(null); setMeError(null); return undefined; }
    const stop = watchLocation(
      (loc) => { setMe(loc); setMeError(null); },
      (err) => setMeError(err),
    );
    return stop;
  }, [tracking]);

  // El encabezado acompaña mi ubicación mientras camino (zona, sin servicios externos)
  useEffect(() => {
    if (me) setLocationName(zoneLabel(me.lat, me.lng) || 'Río Grande · TDF');
  }, [me?.lat, me?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
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
  }, []);

  // Carga las alertas activas. Antes corría UNA vez al montar el mapa, así
  // que una alerta recién reportada no aparecía hasta recargar la página
  // (etapa 5). Ahora se llama al montar, cada vez que el mapa toma foco y
  // cuando Supabase avisa un cambio en "alertas" (tiempo real).
  const loadAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('alertas').select('*').eq('status', 'active')
        .order('created_at', { ascending: false }).limit(50);
      // Si falla, el mapa se queda con lo que ya mostraba
      if (error || !Array.isArray(data)) return;
      const next = data.map(alertToPin);
      // Mismo contenido → mismo array: no se redibujan los pines ni se cierra
      // un globo abierto cuando la recarga no trae nada nuevo
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  // Tiempo real: altas, resoluciones y bajas de alertas. Se agrupan los avisos
  // (300 ms) para no recargar varias veces si llegan juntos.
  // MapScreen está montada dos veces en la navegación (pestaña "Mapa" y stack
  // Mapa→Reportar): cada instancia usa su propio canal. Con el mismo nombre,
  // supabase-js reutiliza el canal y al desmontar una se cortaría la otra.
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8)).current;
  useEffect(() => {
    let timer = null;
    const channel = suscribirAlertas(() => {
      clearTimeout(timer);
      timer = setTimeout(loadAlerts, 300);
    }, `alertas-mapa-${channelSuffix}`);
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [loadAlerts, channelSuffix]);

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

  // Recorrido de la mascota seleccionada: dónde se perdió → avistamientos en
  // orden de hora, con el último destacado (etapa 3). Se limpia al cerrar.
  // En modo rastreo la zona de búsqueda crece con el tiempo: se recalcula
  // cada minuto mientras está abierto.
  useEffect(() => {
    if (!tracking) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [tracking]);

  const track = useMemo(
    () => (selectedPin?.type === 'lost'
      ? buildTrack(selectedPin, sightings, now, { search: tracking })
      : null),
    [selectedPin, sightings, now, tracking],
  );
  // Margen para que el recorrido no quede debajo de la tarjeta:
  // en ancho, la tarjeta ocupa la izquierda; en celular (y en rastreo), abajo.
  // Arriba 80 px: lugar para la etiqueta "Último avistamiento", que va sobre el marcador.
  const trackPadding = useMemo(() => (
    isDesktop && !tracking
      ? [80, 40, 40, CARD_WIDE_WIDTH + SPACING.lg * 2 + 24]
      : [80, 40, Math.max(40, cardHeight - 24), 40]
  ), [isDesktop, cardHeight, tracking]);

  // Hasta dónde va la línea desde mi ubicación y la ruta de "Cómo llegar":
  // el último avistamiento; si no hay, el lugar donde se perdió.
  const meTarget = useMemo(() => {
    const pts = track?.points || [];
    const p = pts.filter((x) => x.kind === 'sighting').pop() || pts.find((x) => x.kind === 'lost');
    return p ? { lat: p.lat, lng: p.lng } : null;
  }, [track]);

  // En rastreo solo se muestra la mascota rastreada (sin el resto de los pines)
  const mapPins = useMemo(
    () => (tracking && selectedPin ? [selectedPin] : filteredPins),
    [tracking, selectedPin, filteredPins],
  );

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
    setTracking(false);
    Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(
      () => setSelectedPin(null)
    );
  }, [slideAnim]);

  const startTracking = useCallback(() => setTracking(true), []);
  const stopTracking  = useCallback(() => setTracking(false), []);

  // "¡Ya lo encontré!" (solo el dueño): confirma y marca la alerta como resuelta.
  // RLS de alertas: solo el dueño puede modificarla ("Gestionar alertas propias").
  const confirmFoundNow = useCallback(async () => {
    const pin = confirmFound;
    if (!pin || resolving) return;
    setResolving(true);
    try {
      await resolverAlerta(pin.id);
      setConfirmFound(null);
      hideCard();
      setPins((prev) => prev.filter((p) => p.id !== pin.id)); // sale del mapa ya, sin esperar la recarga
      loadAlerts();
      setInfoMessage({ title: `🎉 ¡Qué alegría!`, body: `${pin.name} ya figura como encontrado/a y dejó de aparecer como perdido/a en el mapa.` });
    } catch (e) {
      setConfirmFound(null);
      setInfoMessage({ title: 'No pudimos marcarlo', body: 'Revisá tu conexión y probá de nuevo. También podés hacerlo desde Perfil → Mis reportes.' });
    } finally {
      setResolving(false);
    }
  }, [confirmFound, resolving, hideCard, loadAlerts]);

  // Tiempo real del recorrido: un avistamiento nuevo de la mascota abierta
  // extiende la línea sin recargar.
  const selectedLostId = selectedPin?.type === 'lost' ? selectedPin.id : null;
  useEffect(() => {
    if (!selectedLostId || FALLBACK_PINS.some(f => f.id === selectedLostId)) return undefined;
    const channel = suscribirAvistamientos(
      selectedLostId,
      () => loadSightings(selectedLostId),
      `avistamientos-${selectedLostId}-${channelSuffix}`,
    );
    return () => { supabase.removeChannel(channel); };
  }, [selectedLostId, loadSightings, channelSuffix]);

  // Si la alerta de la tarjeta abierta se resolvió o se borró, cerrar la tarjeta
  useEffect(() => {
    const isDemo = FALLBACK_PINS.some(f => f.id === selectedPin?.id);
    if (selectedPin && !isDemo && !pins.some(p => p.id === selectedPin.id)) {
      hideCard();
    }
  }, [pins]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // "Lo vi aquí" abre la captura con foto (SightingCaptureModal): la foto, el
  // GPS del momento de la foto y la nota se guardan juntos.
  const handleLoVi = useCallback((pin) => setCapturePin(pin), []);

  const handleSightingSubmitted = useCallback(async () => {
    const pin = capturePin;
    setCapturePin(null);
    if (!pin) return;
    await loadSightings(pin.id); // refresca la lista — el nuevo avistamiento aparece al toque
    setInfoMessage({ title: '✅ Avistamiento registrado', body: `¡Gracias! Tu foto y tu ubicación ayudan al dueño a encontrar a ${pin.name}.` });
  }, [capturePin, loadSightings]);

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

      {/* ── Confirmar "¡Ya lo encontré!" (solo el dueño) ── */}
      <Modal visible={!!confirmFound} transparent animationType="fade" onRequestClose={() => !resolving && setConfirmFound(null)}>
        <Pressable style={scr.modalBackdrop} onPress={() => !resolving && setConfirmFound(null)}>
          <Pressable style={scr.modalBox} onPress={() => {}}>
            <Text style={scr.modalTitle}>¿Ya encontraste a {confirmFound?.name}?</Text>
            <Text style={scr.modalSub}>
              La alerta se marca como resuelta y deja de aparecer como perdida en el mapa y en "Cerca de ti".
            </Text>
            <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable
                style={[scr.modalBtn, { backgroundColor: '#15803D', opacity: resolving ? 0.6 : 1 }]}
                onPress={confirmFoundNow}
                disabled={resolving}
                accessibilityRole="button"
              >
                <Text style={scr.modalBtnText}>{resolving ? 'Marcando…' : 'Sí, ya está en casa'}</Text>
              </Pressable>
              <Pressable style={scr.modalCancelBtn} onPress={() => setConfirmFound(null)} disabled={resolving}
                accessibilityRole="button">
                <Text style={scr.modalCancelTxt}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Filtros (ocultos en modo rastreo: más lugar para el mapa) ── */}
      {!tracking && (
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
      )}

      {/* ── Mapa Leaflet (mapa real) ── */}
      <LeafletMap
        pins={mapPins}
        dark={tracking}
        // En rastreo, mi ubicación es el punto azul en vivo (no el pin 📱 fijo)
        userLocation={tracking ? null : userLocation}
        me={tracking ? me : null}
        meTarget={meTarget}
        centerLat={center.lat}
        centerLng={center.lng}
        zoom={13}
        onPinContact={showCard}
        track={track}
        trackPadding={trackPadding}
        style={{ flex: 1 }}
      />

      {/* ── Leyenda (oculta en modo rastreo) ── */}
      {!tracking && (
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
      )}

      {/* ── Card de detalle slide-up (en rastreo: barra chica abajo) ── */}
      {selectedPin && (
        <Animated.View
          style={[
            scr.cardSlot,
            tracking ? scr.cardSlotTracking : (isDesktop && scr.cardSlotWide),
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Se mide el contenido (y no el Animated.View): con key por modo se
              vuelve a montar al pasar tarjeta ↔ barra y onLayout se dispara
              seguro. Antes el alto quedaba el de la tarjeta grande y el mapa
              reservaba ~420 px abajo para una barra de 174. */}
          <View
            key={tracking ? 'trk' : 'card'}
            onLayout={(e) => setCardHeight(
              Math.round(e.nativeEvent.layout.height) + (tracking ? SPACING.md : SPACING.xl + 8)
            )}
          >
          {tracking ? (
            <TrackingBar
              pin={selectedPin}
              track={track}
              sightings={sightings}
              onExit={stopTracking}
              onLoVi={handleLoVi}
              me={me}
              meError={meError}
              target={meTarget}
              onDirections={openWalkingDirections}
            />
          ) : (
            <PinCard
              pin={selectedPin}
              onClose={hideCard}
              onContact={handleContact}
              onLoVi={handleLoVi}
              onTrack={startTracking}
              onFound={setConfirmFound}
              isOwner={!!currentUser?.id && currentUser.id === selectedPin.user_id}
              sightings={sightings}
              loadingSightings={loadingSightings}
            />
          )}
          </View>
        </Animated.View>
      )}

      {/* ── "Lo vi aquí": foto + GPS del momento + nota ── */}
      {capturePin && (
        <SightingCaptureModal
          pin={capturePin}
          lostPoint={capturePin.exactLocation ? { lat: capturePin.lat, lng: capturePin.lng } : null}
          onClose={() => setCapturePin(null)}
          onSubmitted={handleSightingSubmitted}
        />
      )}

      {/* ── FAB Reportar (oculto en rastreo: tapaba la barra) ── */}
      {!tracking && (
      <Pressable
        style={scr.fab}
        onPress={() => navigation.navigate('Reportar')}
        accessibilityRole="button"
        accessibilityLabel="Reportar una mascota"
      >
        <Text style={scr.fabIcon}>＋</Text>
        <Text style={scr.fabLabel}>Reportar</Text>
      </Pressable>
      )}
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
  // En pantallas anchas la tarjeta va a la izquierda, angosta, para que el
  // recorrido de avistamientos se vea a la derecha (antes tapaba todo el mapa).
  cardSlotWide: {
    right: undefined, width: CARD_WIDE_WIDTH + SPACING.lg * 2,
  },
  // Modo rastreo: barra chica abajo, centrada, sin tapar el mapa
  cardSlotTracking: {
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    maxWidth: 560, marginHorizontal: 'auto', // centrada en pantallas anchas
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
