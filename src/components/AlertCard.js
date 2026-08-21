// ─────────────────────────────────────────────────────────────────────────────
//  AlertCard v3 — Airbnb-style
//  70 % foto · 30 % strip mínimo · sombra suave · bordes 28px
//  Paleta: teal / coral / verde / rojo — sin violeta ni azul
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Clock, Navigation2 } from 'lucide-react-native';
import { C }        from '../theme/colors';
import { R, S, SH } from '../theme/spacing';
import { T }        from '../theme/typography';

// ── Tipos — solo teal / coral / verde / rojo ──────────────────────────────────
const TYPE = {
  lost:     { label: 'PERDIDO',    bg: C.lost,    accent: C.lost    },
  found:    { label: 'ENCONTRADO', bg: C.found,   accent: C.found   },
  adoption: { label: 'ADOPCIÓN',   bg: C.teal,    accent: C.teal    },
};

const PLACEHOLDER = {
  lost:     'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600&q=90',
  found:    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=90',
  adoption: 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=600&q=90',
};

// Altura total de la card: CARD_H.  Foto: 70 % = PHOTO_H.  Strip: 30 % = STRIP_H.
const CARD_W  = 172;
const CARD_H  = 230;
const PHOTO_H = Math.round(CARD_H * 0.70);   // 161px
const STRIP_H = CARD_H - PHOTO_H;             // 69px

export default function AlertCard({ item, onPress, width = CARD_W }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [liked, setLiked] = useState(false);
  // Antes solo caía al placeholder si photo_url venía null/vacío — un link
  // roto (foto borrada del hosting, etc.) se intentaba cargar igual y
  // quedaba en blanco. onError abajo detecta la falla real de carga.
  const [imgFailed, setImgFailed] = useState(false);

  const type  = TYPE[item.type] || TYPE.lost;
  const photo = (item.photo && !imgFailed)
    ? (typeof item.photo === 'string' ? { uri: item.photo } : item.photo)
    : { uri: PLACEHOLDER[item.type] || PLACEHOLDER.lost };

  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }).start();

  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[s.card, { width, height: CARD_H }, { transform: [{ scale }] }]}>

        {/* ── FOTO 70 % ────────────────────────────────────────────────────── */}
        <View style={[s.imgWrap, { height: PHOTO_H }]}>
          <Image
            source={photo}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />

          {/* Degradé sobre la foto — negro → transparente desde abajo */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
            locations={[0.25, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Badge tipo — top left */}
          <View style={[s.badge, { backgroundColor: type.bg }]}>
            <Text style={s.badgeTxt}>{type.label}</Text>
          </View>

          {/* Heart — top right */}
          <TouchableOpacity
            style={s.heartBtn}
            onPress={() => setLiked(v => !v)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Heart
              size={14}
              color={liked ? '#EF4444' : C.white}
              fill={liked ? '#EF4444' : 'none'}
              strokeWidth={2}
            />
          </TouchableOpacity>

          {/* Nombre + zona sobre la foto */}
          <View style={s.imgFooter}>
            <Text style={s.nameOnImg} numberOfLines={1}>{item.name}</Text>
            <Text style={s.zoneOnImg} numberOfLines={1}>{item.zone}</Text>
          </View>
        </View>

        {/* ── STRIP 30 % ───────────────────────────────────────────────────── */}
        <View style={[s.strip, { height: STRIP_H }]}>
          <View style={s.chipRow}>
            <View style={s.chip}>
              <Clock size={10} color={C.inkLight} strokeWidth={2} />
              <Text style={s.chipTxt}>{item.time}</Text>
            </View>
            {item.dist && (
              <View style={[s.chip, { backgroundColor: C.tealLight }]}>
                <Navigation2 size={10} color={C.tealDark} strokeWidth={2} />
                <Text style={[s.chipTxt, { color: C.tealDark }]}>{item.dist}</Text>
              </View>
            )}
          </View>
        </View>

      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },

  // Foto
  imgWrap:   { width: '100%', overflow: 'hidden' },
  badge:     {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: R.full,
  },
  badgeTxt:  { fontSize: 9, fontWeight: '800', color: C.white, letterSpacing: 0.8 },
  heartBtn:  {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Texto sobre foto
  imgFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 28 },
  nameOnImg: {
    fontSize: T.base, fontWeight: '800', color: C.white,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  zoneOnImg: { fontSize: 10, color: 'rgba(255,255,255,0.80)', marginTop: 1 },

  // Strip
  strip:    { paddingHorizontal: 12, justifyContent: 'center' },
  chipRow:  { flexDirection: 'row', gap: 6 },
  chip:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: R.full,
    backgroundColor: C.cloud,
  },
  chipTxt:  { fontSize: 10, fontWeight: '600', color: C.inkLight },
});
