import React, { useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated,
  PanResponder, TouchableOpacity, Platform,
} from 'react-native';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';

const SWIPE_THRESHOLD = 120;
const SWIPE_OUT_DURATION = 250;
const USE_NATIVE = Platform.OS !== 'web';

export default function TinderCard({
  item,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: USE_NATIVE,
      }),
      onPanResponderRelease: (e, { dx, vx, vy }) => {
        let velocity = vx;
        if (velocity < -0.3) velocity = -0.3;
        if (velocity > 0.3) velocity = 0.3;

        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          Animated.timing(pan, {
            toValue: { x: velocity < 0 ? -500 : 500, y: vy * 100 },
            duration: SWIPE_OUT_DURATION,
            useNativeDriver: USE_NATIVE,
          }).start();

          if (velocity < 0) {
            onSwipeLeft?.(item);
          } else {
            onSwipeRight?.(item);
          }
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: USE_NATIVE,
          }).start();
        }
      },
    })
  ).current;

  const rotateCard = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const opacity = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [0.5, 1, 0.5],
  });

  return (
    <Animated.View
      style={[
        st.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: rotateCard },
          ],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onTap}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={st.photo} resizeMode="cover" />
        ) : (
          <View style={[st.photo, st.photoPlaceholder]}>
            <Text style={{ fontSize: 60 }}>🏠</Text>
          </View>
        )}

        <View style={st.overlay} />

        <View style={st.badge}>
          <Text style={st.badgeTxt}>EN ADOPCIÓN</Text>
        </View>

        <View style={st.info}>
          <Text style={st.name}>{item.name || 'Sin nombre'}</Text>
          <Text style={st.type}>
            {item.type || 'Perro'} · {item.zone || 'Río Grande'}
          </Text>
          {item.description ? (
            <Text style={st.desc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={st.actions}>
        <TouchableOpacity style={st.btnNo} onPress={() => onSwipeLeft?.(item)}>
          <Text style={st.btnNoTxt}>❌</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.btnYes} onPress={() => onSwipeRight?.(item)}>
          <Text style={st.btnYesTxt}>❤️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: C.white,
    borderRadius: R.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  photo: {
    width: '100%',
    height: '80%',
  },
  photoPlaceholder: {
    backgroundColor: C.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: C.teal,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.5,
  },
  info: {
    padding: S[12],
    gap: 4,
    backgroundColor: C.white,
  },
  name: {
    fontSize: T.lg,
    fontWeight: '800',
    color: C.ink,
  },
  type: {
    fontSize: T.sm,
    color: C.inkLight,
    fontWeight: '500',
  },
  desc: {
    fontSize: T.sm,
    color: C.inkMid,
    lineHeight: 18,
  },
  actions: {
    position: 'absolute',
    bottom: S[12],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: S[16],
  },
  btnNo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F3',
    borderWidth: 2,
    borderColor: '#FFE0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNoTxt: {
    fontSize: 28,
  },
  btnYes: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FFFE',
    borderWidth: 2,
    borderColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnYesTxt: {
    fontSize: 28,
  },
});
