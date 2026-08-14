import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { useIsDesktop } from '../hooks/useIsDesktop';

function formatTime(ts) {
  const diff = (Date.now() - new Date(ts)) / 60000;
  if (diff < 60) return `${Math.round(diff)} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)} h`;
  return `${Math.floor(diff / 1440)} días`;
}

function PetCard({ item, onPress }) {
  return (
    <TouchableOpacity style={st.card} onPress={onPress} activeOpacity={0.85}>
      {item.photo_url
        ? <Image source={{ uri: item.photo_url }} style={st.photo} resizeMode="cover" />
        : <View style={[st.photo, st.photoPlaceholder]}><Text style={{ fontSize: 40 }}>🐾</Text></View>
      }
      <View style={st.badge}>
        <Text style={st.badgeTxt}>ENCONTRADO</Text>
      </View>
      <View style={st.info}>
        <Text style={st.name}>{item.name || 'Sin nombre'}</Text>
        <Text style={st.sub}>{item.zone || 'Zona desconocida'} · {formatTime(item.created_at)}</Text>
        {item.description ? <Text style={st.desc} numberOfLines={2}>{item.description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function EncontradosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const numColumns = isDesktop ? 4 : 2;
  const [alertas, setAlertas]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await supabase
        .from('alertas')
        .select('*')
        .eq('type', 'found')
        .order('created_at', { ascending: false });
      setAlertas(data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity style={st.back} onPress={() => navigation.goBack()}>
          <Text style={st.backTxt}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={st.title}>Encontrados</Text>
          <Text style={st.sub2}>Mascotas halladas en Río Grande</Text>
        </View>
      </View>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator color={C.found} size="large" />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={alertas}
          keyExtractor={i => i.id}
          numColumns={numColumns}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={[st.list, isDesktop && st.listDesktop]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.found} />}
          renderItem={({ item }) => <PetCard item={item} onPress={() => {}} />}
          ListEmptyComponent={
            <View style={st.center}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={st.emptyTxt}>No hay mascotas encontradas aún</Text>
              <Text style={st.emptySub}>Si encontraste una, reportala desde el botón SOS</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cloud },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: S[16], backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  back:   { padding: 4 },
  backTxt:{ fontSize: 32, color: C.found, lineHeight: 36 },
  title:  { fontSize: T.xl, fontWeight: '800', color: C.ink },
  sub2:   { fontSize: T.sm, color: C.inkLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S[32], gap: 12 },
  emptyTxt: { fontSize: T.lg, fontWeight: '700', color: C.ink, textAlign: 'center' },
  emptySub: { fontSize: T.sm, color: C.inkLight, textAlign: 'center' },

  list: { padding: S[16], gap: 12, paddingBottom: 100 },
  // Desktop (>900px): grilla más ancha (4 columnas) centrada, aprovecha el espacio
  listDesktop: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  card: { flex: 1, backgroundColor: C.white, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  photo: { width: '100%', aspectRatio: 1 },
  photoPlaceholder: { backgroundColor: C.foundBg, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: C.found, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 9, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  info: { padding: 10 },
  name: { fontSize: T.base, fontWeight: '700', color: C.ink },
  sub:  { fontSize: T.xs, color: C.inkLight, marginTop: 2 },
  desc: { fontSize: T.xs, color: C.inkMid, marginTop: 4, lineHeight: 16 },
});
