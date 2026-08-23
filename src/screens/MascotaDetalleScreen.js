// ─────────────────────────────────────────────────────────────────────────────
//  MascotaDetalleScreen — detalle de un reporte (perdido / encontrado / adopción)
//  Se abre desde Home → "Cerca de ti" y Perfil → "Mis Favoritos" → "Ver detalles".
//  Recibe { id } por route.params y trae la fila completa de "alertas" —así
//  siempre tiene foto, nombre, zona, tipo, descripción y fecha, sin importar
//  qué tan poca info tenía el objeto que la abrió (ej: las cards de Home no
//  traen description/created_at).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Calendar, PawPrint } from 'lucide-react-native';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
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

  const Header = () => (
    <View style={[st.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={st.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ArrowLeft size={22} color={C.ink} strokeWidth={2.25} />
      </TouchableOpacity>
      <Text style={st.headerTitle}>Detalle</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={[st.screen, st.center]}>
        <Header />
        <View style={st.center}>
          <ActivityIndicator color={C.teal} size="large" />
        </View>
      </View>
    );
  }

  if (notFound || !mascota) {
    return (
      <View style={st.screen}>
        <Header />
        <View style={st.center}>
          <PawPrint size={48} color={C.inkMuted} strokeWidth={1.5} />
          <Text style={st.notFoundTxt}>No pudimos encontrar esta mascota</Text>
          <Text style={st.notFoundSub}>Puede que el reporte ya no esté disponible.</Text>
          <TouchableOpacity style={st.backLink} onPress={() => navigation.goBack()}>
            <Text style={st.backLinkTxt}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const type = TYPE_INFO[mascota.type] || TYPE_INFO.lost;

  return (
    <View style={st.screen}>
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.scroll, isDesktop && st.scrollDesktop, { paddingBottom: insets.bottom + 40 }]}
      >
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
          {/* Badge tipo */}
          <View style={[st.badge, { backgroundColor: type.bg }]}>
            <Text style={[st.badgeTxt, { color: type.color }]}>{type.label.toUpperCase()}</Text>
          </View>

          {/* Nombre */}
          <Text style={st.name}>{mascota.name || 'Sin nombre'}</Text>

          {/* Zona */}
          <View style={st.row}>
            <MapPin size={16} color={C.inkLight} strokeWidth={2} />
            <Text style={st.rowTxt}>{mascota.zone || 'Zona desconocida'}</Text>
          </View>

          {/* Fecha */}
          <View style={st.row}>
            <Calendar size={16} color={C.inkLight} strokeWidth={2} />
            <Text style={st.rowTxt}>{formatFecha(mascota.created_at)}</Text>
          </View>

          {/* Descripción */}
          <View style={st.descWrap}>
            <Text style={st.descLabel}>Descripción</Text>
            <Text style={st.descTxt}>
              {mascota.description?.trim() ? mascota.description : 'Sin descripción.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: S[32] },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S[16], paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.base, fontWeight: '700', color: C.ink },

  scroll: { flexGrow: 1 },
  scrollDesktop: { width: '100%', maxWidth: 640, alignSelf: 'center' },

  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: C.cloud },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  body: { padding: S[20], gap: 4 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: R.full, marginBottom: 10,
  },
  badgeTxt: { fontSize: T.xs, fontWeight: '800', letterSpacing: 0.6 },

  name: { fontSize: T['2xl'], fontWeight: '800', color: C.ink, marginBottom: 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rowTxt: { fontSize: T.base, color: C.inkMid, fontWeight: '500' },

  descWrap: { marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  descLabel: { fontSize: T.sm, fontWeight: '700', color: C.inkLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descTxt: { fontSize: T.base, color: C.inkMid, lineHeight: 22 },

  notFoundTxt: { fontSize: T.lg, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 8 },
  notFoundSub: { fontSize: T.sm, color: C.inkLight, textAlign: 'center' },
  backLink: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16 },
  backLinkTxt: { fontSize: T.sm, color: C.teal, fontWeight: '700' },
});
