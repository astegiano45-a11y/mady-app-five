// ─────────────────────────────────────────────────────────────────────────────
//  BannerCarousel — banners publicitarios del Home
//
//  · Lee los banners activos de la tabla banner_ads (se cargan a mano desde
//    el dashboard de Supabase — todavía no hay panel de administración).
//  · Rota solo entre las imágenes cada 5 s, con crossfade.
//  · Cada banner es imagen + link: al tocarlo abre la URL en una pestaña
//    nueva (web) o en el navegador del sistema (nativo).
//  · Mismo lenguaje visual que las tarjetas del resto de la app: bordes
//    redondeados 28, overflow hidden, sombra media.
//
//  Si no hay banners activos no renderiza nada (no ocupa espacio).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Pressable, Animated, Image, Platform, Linking,
} from 'react-native';

import { getBannerAds } from '../services/bannerAdsService';
import { C }            from '../theme/colors';
import { R, S, SH }     from '../theme/spacing';

const ROTATE_MS = 5000;   // 5 s por banner
const FADE_MS   = 600;    // crossfade

function openLink(url) {
  if (!url) return;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

// ── Una capa del crossfade ──────────────────────────────────────────────────
function BannerSlide({ banner, active, onPress }) {
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: active ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [active]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { opacity }]}
      pointerEvents={active && !failed ? 'auto' : 'none'}
    >
      {!failed && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress}>
          <Image
            source={{ uri: banner.imagen_url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function BannerCarousel({ isDesktop }) {
  const [banners, setBanners] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    getBannerAds().then((d) => { if (alive) setBanners(d); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const safeIdx = idx % banners.length;

  return (
    <View style={s.wrap}>
      <View style={[s.card, isDesktop && s.cardDesktop]}>
        {banners.map((b, i) => (
          <BannerSlide
            key={b.id}
            banner={b}
            active={i === safeIdx}
            onPress={() => openLink(b.link_url)}
          />
        ))}

        {banners.length > 1 && (
          <View style={s.dots} pointerEvents="none">
            {banners.map((b, i) => (
              <View key={b.id} style={[s.dot, i === safeIdx && s.dotActive]} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: S[20], marginTop: S[20] },
  card: {
    width: '100%',
    aspectRatio: 3,            // ~ banner 320×107 en mobile
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.cloudMid,
    ...SH.md,
  },
  cardDesktop: {
    maxWidth: 1560,
    alignSelf: 'center',
    aspectRatio: 6.5,         // panorámico en desktop; aprovecha el ancho
  },
  dots: {
    position: 'absolute',
    left: 0, right: 0, bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: R.full,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: { width: 18, backgroundColor: C.white },
});
