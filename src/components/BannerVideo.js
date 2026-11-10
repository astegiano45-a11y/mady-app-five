// ─────────────────────────────────────────────────────────────────────────────
//  BannerVideo (iOS/Android) — video del banner publicitario con expo-video.
//  En nativo VideoView reproduce dentro de la vista (no abre pantalla
//  completa salvo que se pida). La versión web está en BannerVideo.web.js.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function BannerVideo({ uri, active, onError, style }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Solo el banner visible reproduce; el resto queda pausado.
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  useEffect(() => {
    const sub = player.addListener('statusChange', (status) => {
      if (status === 'error') onError?.();
    });
    return () => sub.remove();
  }, [player, onError]);

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }, style]}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      pointerEvents="none"
    />
  );
}
