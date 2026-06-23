// ─────────────────────────────────────────────────────────────────────────────
//  PetCard v2 — Tarjeta de mascota registrada (mis mascotas)
//  Uso: lista de mascotas del usuario, pantalla de perfil
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Image,
} from 'react-native';
import { C }        from '../theme/colors';
import { R, S, SH } from '../theme/spacing';
import { T }        from '../theme/typography';

const STATUS = {
  home:  { label: 'En casa',    color: C.found,   bg: C.foundBg  },
  lost:  { label: 'Perdido',    color: C.lost,    bg: C.lostBg   },
  found: { label: 'Encontrado', color: C.teal,    bg: C.tealLight },
};

const PLACEHOLDER_PHOTOS = {
  '🐕': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&q=80',
  '🐱': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&q=80',
  '🐇': 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&q=80',
  default: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80',
};

export default function PetCard({ pet, onPress, variant = 'row' }) {
  const scale = useRef(new Animated.Value(1)).current;
  const st    = STATUS[pet.status] || STATUS.home;
  const photo = pet.photo
    ? (typeof pet.photo === 'string' ? { uri: pet.photo } : pet.photo)
    : { uri: PLACEHOLDER_PHOTOS[pet.emoji] || PLACEHOLDER_PHOTOS.default };

  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }).start();

  if (variant === 'card') {
    return (
      <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} activeOpacity={1}>
        <Animated.View style={[cd.card, { transform: [{ scale }] }, SH.sm]}>
          <Image source={photo} style={cd.img} resizeMode="cover" />
          <View style={[cd.statusDot, { backgroundColor: st.color }]} />
          <View style={cd.info}>
            <Text style={cd.name} numberOfLines={1}>{pet.name}</Text>
            <Text style={cd.breed} numberOfLines={1}>{pet.breed}</Text>
            <View style={[cd.tag, { backgroundColor: st.bg }]}>
              <Text style={[cd.tagTxt, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // variant === 'row' (default)
  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[rw.row, { transform: [{ scale }] }]}>
        <View style={[rw.avatarWrap, { backgroundColor: st.bg }]}>
          {pet.photo ? (
            <Image source={photo} style={rw.avatarImg} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 28 }}>{pet.emoji}</Text>
          )}
          <View style={[rw.statusDot, { backgroundColor: st.color }]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={rw.name}>{pet.name}</Text>
          <Text style={rw.meta}>{pet.breed} · {pet.age}</Text>
        </View>
        <View style={[rw.pill, { backgroundColor: st.bg, borderColor: st.color + '40' }]}>
          <Text style={[rw.pillTxt, { color: st.color }]}>{st.label}</Text>
        </View>
        <Text style={rw.arrow}>›</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  card:      { width: 140, backgroundColor: C.white, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  img:       { width: '100%', height: 100 },
  statusDot: { position: 'absolute', top: 90, right: 10, width: 12, height: 12, borderRadius: R.full, borderWidth: 2, borderColor: C.white },
  info:      { padding: S[12], gap: S[4] },
  name:      { fontSize: T.base, fontWeight: T.heavy, color: C.ink },
  breed:     { fontSize: T.xs,   color: C.inkMuted },
  tag:       { alignSelf: 'flex-start', paddingHorizontal: S[8], paddingVertical: 2, borderRadius: R.full },
  tagTxt:    { fontSize: 10, fontWeight: T.bold },
});

const rw = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: S[14], backgroundColor: C.white, borderRadius: R.xl, padding: S[16], marginBottom: S[10], borderWidth: 1, borderColor: C.border, ...SH.xs },
  avatarWrap:{ width: 52, height: 52, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  statusDot: { position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: R.full, borderWidth: 2, borderColor: C.white },
  name:      { fontSize: T.base, fontWeight: T.heavy, color: C.ink },
  meta:      { fontSize: T.xs,   color: C.inkMuted },
  pill:      { paddingHorizontal: S[10], paddingVertical: S[4], borderRadius: R.full, borderWidth: 1 },
  pillTxt:   { fontSize: T.xs,   fontWeight: T.bold },
  arrow:     { fontSize: 22, color: C.inkMuted },
});
