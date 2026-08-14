import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { getAdoptantProfile, likeAdoption } from '../services/adoptantService';
import { useIsDesktop } from '../hooks/useIsDesktop';

export default function AdopcionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [mascotas, setMascotas] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    checkProfileAndLoad();
  }, []);

  const checkProfileAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setHasProfile(true); // Fuerzo que siempre tenga perfil para testear Tinder
      loadMascotas();
    } catch (err) {
      console.error('❌ checkProfileAndLoad error:', err);
      setLoading(false);
    }
  };

  const loadMascotas = async () => {
    try {
      const { data } = await supabase
        .from('alertas')
        .select('*')
        .eq('type', 'adoption')
        .order('created_at', { ascending: false });
      setMascotas(data || []);
    } catch (err) {
      console.warn('loadMascotas error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeRight = async (item) => {
    if (!userId) return;
    try {
      await likeAdoption(userId, item.id, true);
      Alert.alert('❤️ Me gusta', `${item.name} agregado a favoritos`);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 500);
    } catch (err) {
      console.warn('handleSwipeRight error:', err);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipeLeft = async (item) => {
    if (!userId) return;
    try {
      await likeAdoption(userId, item.id, false);
    } catch (err) {
      console.warn('handleSwipeLeft error:', err);
    }
    setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
  };

  if (loading) {
    return (
      <View style={[st.screen, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  if (!hasProfile) {
    return (
      <View style={[st.screen, { paddingTop: insets.top }]}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={st.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Adopción</Text>
            <Text style={st.sub2}>Mascotas buscando hogar</Text>
          </View>
        </View>

        <View style={st.emptyContainer}>
          <Text style={{ fontSize: 64 }}>🏠</Text>
          <Text style={st.emptyTxt}>Crea tu perfil de adoptante</Text>
          <Text style={st.emptySub}>
            Responde algunas preguntas para que te mostremos mascotas acordes a tu estilo de vida
          </Text>
          <TouchableOpacity
            style={st.createProfileBtn}
            onPress={() => navigation.navigate('PerfilAdoptante')}
          >
            <Text style={st.createProfileBtnTxt}>Crear perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mascotas.length === 0) {
    return (
      <View style={[st.screen, { paddingTop: insets.top }]}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={st.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Adopción</Text>
            <Text style={st.sub2}>Mascotas buscando hogar</Text>
          </View>
        </View>

        <View style={st.emptyContainer}>
          <Text style={{ fontSize: 64 }}>🐕</Text>
          <Text style={st.emptyTxt}>No hay mascotas en adopción</Text>
          <Text style={st.emptySub}>
            Por ahora no tenemos mascotas que coincidan con tu perfil
          </Text>
        </View>
      </View>
    );
  }

  const currentPet = mascotas[currentIndex];

  if (currentIndex >= mascotas.length) {
    return (
      <View style={[st.screen, { paddingTop: insets.top }]}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={st.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Adopción</Text>
            <Text style={st.sub2}>Mascotas buscando hogar</Text>
          </View>
        </View>

        <View style={st.emptyContainer}>
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text style={st.emptyTxt}>¡Viste todas las mascotas!</Text>
          <Text style={st.emptySub}>Vuelve pronto para ver más</Text>
          <TouchableOpacity
            style={st.refreshBtn}
            onPress={() => { setCurrentIndex(0); loadMascotas(); }}
          >
            <Text style={st.refreshBtnTxt}>Volver a comenzar</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={st.title}>Adopción</Text>
          <Text style={st.sub2}>{currentIndex + 1} / {mascotas.length}</Text>
        </View>
        <TouchableOpacity
          style={st.headerBtn}
          onPress={() => navigation.navigate('MisFavoritos')}
        >
          <Text style={st.headerBtnTxt}>❤️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={st.headerBtn}
          onPress={() => navigation.navigate('PerfilAdoptante')}
        >
          <Text style={st.headerBtnTxt}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[st.content, isDesktop && st.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {currentPet && (
          <View style={[st.petCard, isDesktop && st.petCardDesktop]}>
            {currentPet.photo_url ? (
              <Image source={{ uri: currentPet.photo_url }} style={st.petPhoto} resizeMode="cover" />
            ) : (
              <View style={[st.petPhoto, st.petPhotoPlaceholder]}>
                <Text style={{ fontSize: 80 }}>🏠</Text>
              </View>
            )}

            <View style={st.petInfo}>
              <Text style={st.petName}>{currentPet.name}</Text>
              <Text style={st.petZone}>{currentPet.zone}</Text>
              <Text style={st.petDesc}>{currentPet.description}</Text>
            </View>

            <View style={st.buttons}>
              <TouchableOpacity
                style={st.btnNo}
                onPress={() => handleSwipeLeft(currentPet)}
              >
                <Text style={st.btnNoTxt}>No me interesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.btnYes}
                onPress={() => handleSwipeRight(currentPet)}
              >
                <Text style={st.btnYesTxt}>❤️ Me gusta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
  sub2: { fontSize: T.sm, color: C.inkLight },
  headerBtn: { padding: 8, marginLeft: 4 },
  headerBtnTxt: { fontSize: 20 },

  content: { padding: S[16], paddingBottom: 100 },
  // Desktop (>900px): la tarjeta de swipe se mantiene centrada y con un ancho
  // fijo cómodo (es el patrón correcto para este tipo de UI, como Tinder web),
  // en vez de estirarse de punta a punta de la ventana.
  contentDesktop: { alignItems: 'center' },
  petCardDesktop: { width: '100%', maxWidth: 440 },
  petCard: {
    backgroundColor: C.white,
    borderRadius: R.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    gap: S[16],
  },
  petPhoto: {
    width: '100%',
    height: 350,
  },
  petPhotoPlaceholder: {
    backgroundColor: C.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petInfo: {
    paddingHorizontal: S[16],
    gap: 8,
  },
  petName: { fontSize: T.xl, fontWeight: '800', color: C.ink },
  petZone: { fontSize: T.sm, color: C.inkLight, fontWeight: '600' },
  petDesc: { fontSize: T.base, color: C.inkMid, lineHeight: 20 },

  buttons: {
    flexDirection: 'row',
    gap: S[12],
    padding: S[16],
    paddingTop: 0,
  },
  btnNo: {
    flex: 1,
    backgroundColor: '#FFF3F3',
    borderWidth: 2,
    borderColor: '#FFE0E0',
    borderRadius: R.lg,
    paddingVertical: S[12],
    alignItems: 'center',
  },
  btnNoTxt: { fontSize: T.sm, fontWeight: '700', color: '#FF6B6B' },
  btnYes: {
    flex: 1,
    backgroundColor: C.teal,
    borderRadius: R.lg,
    paddingVertical: S[12],
    alignItems: 'center',
  },
  btnYesTxt: { fontSize: T.sm, fontWeight: '700', color: C.white },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S[32],
    gap: 12,
  },
  emptyTxt: { fontSize: T.lg, fontWeight: '700', color: C.ink, textAlign: 'center' },
  emptySub: { fontSize: T.sm, color: C.inkLight, textAlign: 'center' },

  createProfileBtn: {
    marginTop: 16,
    backgroundColor: C.teal,
    borderRadius: R.xl,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  createProfileBtnTxt: { fontSize: T.base, fontWeight: '700', color: C.white },

  refreshBtn: {
    marginTop: 16,
    backgroundColor: C.teal,
    borderRadius: R.xl,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  refreshBtnTxt: { fontSize: T.base, fontWeight: '700', color: C.white },
});
