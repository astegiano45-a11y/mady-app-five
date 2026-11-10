// ─────────────────────────────────────────────────────────────────────────────
//  BannerVideo (web) — video del banner publicitario, dentro del banner.
//
//  Por qué no usa expo-video en la web: expo-video 1.2.7 dibuja un <video> SIN
//  el atributo playsinline. Sin ese atributo, Safari de iPhone abre el
//  reproductor a pantalla completa cada vez que se llama a play(), y el
//  carrusel llama a play() cada vez que el banner de video vuelve a quedar
//  activo: se abría en cada rotación.
//
//  Acá el <video> lleva todo lo que iOS necesita para reproducir en línea y
//  sin interacción: playsinline (+ webkit-playsinline para iOS viejos),
//  muted como ATRIBUTO y propiedad (React no refleja el atributo "muted"),
//  autoplay, loop y sin controles, Picture-in-Picture ni AirPlay.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';

export default function BannerVideo({ uri, active, onError, style }) {
  const ref = useRef(null);

  // Atributos que React no aplica bien: se fijan directo en el elemento,
  // antes de cualquier play().
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('x5-playsinline', '');        // navegadores Android basados en X5
    v.disablePictureInPicture = true;
    v.disableRemotePlayback = true;
  }, []);

  // Solo el banner visible reproduce; el resto queda pausado.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.muted = true; // por si algo lo cambió: iOS solo permite autoplay en silencio
      const p = v.play();
      // Modo ahorro de batería en iOS bloquea el autoplay: queda el primer cuadro
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      v.pause();
    }
  }, [active, uri]);

  return (
    <video
      ref={ref}
      src={uri}
      autoPlay={active}
      muted
      loop
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      onError={onError}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', pointerEvents: 'none', display: 'block',
        ...style,
      }}
    />
  );
}
