import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { useIsDesktop } from '../hooks/useIsDesktop';

export default function MisFavoritosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const numColumns = isDesktop ? 4 : 2;
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadFavoritos();
  }, []);

  const loadFavoritos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('adoption_matches')
        .select('alertas(*)')
        .eq('adoptant_id', user.id)
        .eq('adoptant_liked', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavoritos(data?.map(m => m.alertas) || []);
    } catch (err) {
      console.warn('loadFavoritos error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.screen, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={st.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Mis Favoritos</Text>
          <Text style={st.sub}>Mascotas que te gustaron</Text>
        </View>
      </View>

      {favoritos.length === 0 ? (
        <View style={st.emptyContainer}>
          <Text style={{ fontSize: 64 }}>🐾</Text>
          <Text style={st.emptyTxt}>Sin favoritos aún</Text>
          <Text style={st.emptySub}>
            Cuando des "Me gusta" a una mascota, aparecerá aquí
          </Text>
          <TouchableOpacity
            style={st.btn}
            onPress={() => navigation.navigate('Adopcion')}
          >
            <Text style={st.btnTxt}>Ver mascotas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={favoritos}
          keyExtractor={i => i.id}
          numColumns={numColumns}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={[st.list, isDesktop && st.listDesktop]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('MascotaDetalle', { id: item.id })}
            >
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={st.photo} resizeMode="cover" />
              ) : (
                <View style={[st.photo, st.photoPlaceholder]}>
                  <Text style={{ fontSize: 60 }}>🏠</Text>
                </View>
              )}
              <View style={st.info}>
                <Text style={st.name}>{item.name}</Text>
                <Text style={st.zone}>{item.zone}</Text>
                <TouchableOpacity
                  style={st.viewBtn}
                  onPress={() => navigation.navigate('MascotaDetalle', { id: item.id })}
                >
                  <Text style={st.viewBtnTxt}>Ver detalles</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cloud },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: S[16],
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backTxt: { fontSize: 32, color: C.teal, lineHeight: 36 },
  title: { fontSize: T.xl, fontWeight: '800', color: C.ink },
  sub: { fontSize: T.sm, color: C.inkLight },

  list: { padding: S[16], gap: 12, paddingBottom: 100 },
  // Desktop (>900px): grilla más ancha (4 columnas) centrada, aprovecha el espacio
  listDesktop: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  card: { flex: 1, backgroundColor: C.white, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  photo: { width: '100%', aspectRatio: 1 },
  photoPlaceholder: { backgroundColor: C.tealLight, alignItems: 'center', justifyContent: 'center' },
  info: { padding: 12, gap: 8 },
  name: { fontSize: T.base, fontWeight: '700', color: C.ink },
  zone: { fontSize: T.xs, color: C.inkLight },
  viewBtn: { marginTop: 4, backgroundColor: C.tealLight, borderRadius: R.lg, paddingVertical: 6, alignItems: 'center' },
  viewBtnTxt: { fontSize: T.xs, fontWeight: '700', color: C.teal },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S[32], gap: 12 },
  emptyTxt: { fontSize: T.lg, fontWeight: '700', color: C.ink, textAlign: 'center' },
  emptySub: { fontSize: T.sm, color: C.inkLight, textAlign: 'center' },
  btn: { marginTop: 16, backgroundColor: C.teal, borderRadius: R.xl, paddingHorizontal: 24, paddingVertical: 12 },
  btnTxt: { fontSize: T.sm, fontWeight: '700', color: C.white },
});
