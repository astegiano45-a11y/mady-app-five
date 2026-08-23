// ─────────────────────────────────────────────────────────────────────────────
//  MascotaDetalleScreen — detalle de un reporte (perdido / encontrado / adopción)
//  Se abre desde Home → "Cerca de ti" y Perfil → "Mis Favoritos" → "Ver detalles".
//  Recibe { id } por route.params y trae la fila completa de "alertas" —así
//  siempre tiene foto, nombre, zona, tipo, descripción y fecha, sin importar
//  qué tan poca info tenía el objeto que la abrió (ej: las cards de Home no
//  traen description/created_at).
//
//  Estilo: header degradé teal (igual que PerfilUsuarioScreen), tarjeta blanca
//  redondeada con sombra (mismo tratamiento que AlertCard/MisFavoritosScreen),
//  badge de tipo con la paleta "suave" que ya usa el popup del mapa
//  (MapScreen.TYPE_INFO), e íconos en chip circular teal como los del menú de
//  Perfil (PerfilUsuarioScreen.MenuRow).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Calendar, PawPrint } from 'lucide-react-native';
import { C } from '../theme/colors';
import { R, S, SH } from '../theme/spacing';
import { T } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { useIsDesktop } from '../hooks/useIsDesktop';

const TYPE_INFO = {
  lost:     { label: 'Perdido',     color: C.lost,  bg: C.lostBg     },
  found:    { label: 'Encontrado',  color: C.found, bg: C.foundBg    },
  adoption: { label: 'En adopción', color: C.teal,  bg: C.tealLight  },
};

function formatFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const fecha = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const diffMin = Math.floor((Date.now() - d) / 60000);
  let relativo;
  if (diffMin < 1) relativo = 'recién';
  else if (diffMin < 60) relativo = `hace ${diffMin} min`;
  else if (diffMin < 1440) relativo = `hace ${Math.floor(diffMin / 60)} h`;
  else relativo = `hace ${Math.floor(diffMin / 1440)} días`;
  return `${fecha} · ${relativo}`;
}

// Fila de dato con ícono en chip circular — mismo tratamiento visual que los
// íconos de MenuRow en PerfilUsuarioScreen (círculo con fondo tintado).
function InfoRow({ Icon, label, value, isLast }) {
  return (
    <View style={[st.infoRow, !isLast && st.infoRowDivider]}>
      <View style={st.iconBadge}>
        <Icon size={16} color={C.teal} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.infoLabel}>{label}</Text>
        <Text style={st.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function MascotaDetalleScreen({ navigation, route }) {
  const insets    = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const id = route?.params?.id;

  const [mascota,  setMascota]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('alertas')
          .select('*')
          .eq('id', id)
          .single();
        if (!active) return;
        if (error || !data) setNotFound(true);
        else setMascota(data);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const type = TYPE_INFO[mascota?.type] || TYPE_INFO.lost;

  return (
    <View style={st.screen}>
      {/* Header degradé — mismo teal que el hero de PerfilUsuarioScreen,
          en vez de un header blanco genérico. */}
      <LinearGradient
        colors={[C.teal, C.tealDeep]}
        style={[st.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={st.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color={C.white} strokeWidth={2.25} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Detalle</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator color={C.teal} size="large" />
        </View>
      ) : notFound || !mascota ? (
        <View style={st.center}>
          <PawPrint size={48} color={C.inkMuted} strokeWidth={1.5} />
          <Text style={st.notFoundTxt}>No pudimos encontrar esta mascota</Text>
          <Text style={st.notFoundSub}>Puede que el reporte ya no esté disponible.</Text>
          <TouchableOpacity style={st.backLink} onPress={() => navigation.goBack()}>
            <Text style={st.backLinkTxt}>← Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          <View style={[st.card, isDesktop && st.cardDesktop]}>
            {/* Foto */}
            {mascota.photo_url && !imgFailed ? (
              <Image
                source={{ uri: mascota.photo_url }}
                style={st.photo}
                resizeMode="cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <View style={[st.photo, st.photoPlaceholder]}>
                <Text style={{ fontSize: 72 }}>🐾</Text>
              </View>
            )}

            <View style={st.body}>
              {/* Badge tipo + nombre — agrupados como bloque de título */}
              <View style={st.titleBlock}>
                <View style={[st.badge, { backgroundColor: type.bg }]}>
                  <View style={[st.badgeDot, { backgroundColor: type.color }]} />
                  <Text style={[st.badgeTxt, { color: type.color }]}>{type.label.toUpperCase()}</Text>
                </View>
                <Text style={st.name}>{mascota.name || 'Sin nombre'}</Text>
              </View>

              {/* Zona + fecha */}
              <View style={st.infoCard}>
                <InfoRow Icon={MapPin} label="ZONA" value={mascota.zone || 'Zona desconocida'} />
                <InfoRow Icon={Calendar} label="FECHA" value={formatFecha(mascota.created_at)} isLast />
              </View>

              {/* Descripción */}
              <View style={st.descCard}>
                <Text style={st.descLabel}>Descripción</Text>
                <Text style={st.descTxt}>
                  {mascota.description?.trim() ? mascota.description : 'Sin descripción.'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cloud },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: S[32] },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S[16], paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitle: { fontSize: T.base, fontWeight: '700', color: C.white },

  scroll: { padding: S[16] },

  // Tarjeta principal — mismo tratamiento que AlertCard / MisFavoritosScreen:
  // blanco, bordes redondeados grandes, sombra suave, foto arriba a sangre.
  card: {
    backgroundColor: C.white,
    borderRadius: R['2xl'],
    overflow: 'hidden',
    ...SH.md,
  },
  cardDesktop: { width: '100%', maxWidth: 640, alignSelf: 'center' },

  // Antes 4/3 (más cuadrada) — más panorámica para que ocupe menos alto y
  // se llegue a ver la tarjeta de info completa sin scrollear tanto.
  photo: { width: '100%', aspectRatio: 16 / 9, backgroundColor: C.cloud },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  body: { padding: S[20] },

  titleBlock: { marginBottom: S[20] },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: R.full, marginBottom: 10,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: T.xs, fontWeight: '800', letterSpacing: 0.6 },

  name: { fontSize: T.xl, fontWeight: '800', color: C.ink },

  // Bloque zona/fecha — "well" tintado como los sub-bloques de Mis reportes,
  // con íconos en chip circular igual que MenuRow de PerfilUsuarioScreen.
  infoCard: {
    backgroundColor: C.cloud,
    borderRadius: R.xl,
    marginBottom: S[16],
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: S[8], paddingHorizontal: S[12] },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  iconBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.tealLight,
  },
  infoLabel: { fontSize: T.xs, fontWeight: '700', color: C.inkLight, letterSpacing: 0.5, marginBottom: 1 },
  infoValue: { fontSize: T.base, fontWeight: '600', color: C.ink },

  descCard: { paddingTop: 4 },
  descLabel: { fontSize: T.sm, fontWeight: '700', color: C.inkLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descTxt: { fontSize: T.base, color: C.inkMid, lineHeight: 22 },

  notFoundTxt: { fontSize: T.lg, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 8 },
  notFoundSub: { fontSize: T.sm, color: C.inkLight, textAlign: 'center' },
  backLink: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16 },
  backLinkTxt: { fontSize: T.sm, color: C.teal, fontWeight: '700' },
});
