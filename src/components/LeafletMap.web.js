// LeafletMap.web.js — Versión web que carga Leaflet directamente en el DOM
// Expo resuelve .web.js automáticamente en plataforma web
//
// El mapa se crea UNA sola vez. Pines, ubicación del usuario y recorrido viven
// en capas propias que se actualizan sin recrear el mapa (etapa 5,
// docs/plan-avistamientos.md). Antes cada cambio de pines destruía y volvía a
// crear el mapa: con las recargas en tiempo real eso reseteaba el zoom/posición
// del usuario y, si coincidía con una animación de zoom, Leaflet tiraba
// "Cannot read properties of undefined (reading '_leaflet_pos')".

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TRACK_SCRIPT } from './mapTrackScript';
import { loadLeaflet } from './leafletLoader.web';

const TYPE_CFG = {
  lost:     { color: '#DC2626', label: 'PERDIDO',    btn: 'Lo vi' },
  found:    { color: '#16A34A', label: 'ENCONTRADO', btn: 'Es mío' },
  adoption: { color: '#9333EA', label: 'ADOPCIÓN',   btn: 'Adoptar' },
};

// Nombre y zona los escribe cualquier usuario al reportar: van escapados
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const safePhoto = (p) => (typeof p === 'string' && p.startsWith('https://') ? esc(p) : null);

// Instala window.__madyTrack (y su CSS) una sola vez por página
function installTrackScript() {
  if (window.__madyTrack) return;
  // eslint-disable-next-line no-new-func
  new Function(TRACK_SCRIPT)();
  const style = document.createElement('style');
  style.setAttribute('data-mady-track', '');
  style.textContent = window.__madyTrack.css;
  document.head.appendChild(style);
}

function pinIcon(L, pin) {
  const cfg   = TYPE_CFG[pin.type] || TYPE_CFG.lost;
  const emoji = pin.type === 'found' ? '🐾' : pin.type === 'adoption' ? '❤️' : '🐕';
  const photo = safePhoto(pin.photo);
  const inner = photo
    ? '<img style="width:42px;height:42px;border-radius:50%;object-fit:cover" src="' + photo + '" alt="" onerror="this.style.display=\'none\'">'
    : emoji;
  const html =
    '<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">' +
    '<div style="width:48px;height:48px;border-radius:50%;background:' + cfg.color + ';border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden">' +
    inner + '</div>' +
    '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ' + cfg.color + ';margin-top:-1px"></div>' +
    '</div>';
  return L.divIcon({ html, className: '', iconSize: [48, 62], iconAnchor: [24, 62] });
}

function pinPopupHtml(pin) {
  const cfg   = TYPE_CFG[pin.type] || TYPE_CFG.lost;
  const emoji = pin.type === 'found' ? '🐾' : pin.type === 'adoption' ? '❤️' : '🐕';
  const photo = safePhoto(pin.photo);
  const photoHtml = photo
    ? '<img style="width:50px;height:50px;border-radius:50%;object-fit:cover;flex-shrink:0" src="' + photo + '" alt="">'
    : '<span style="font-size:32px">' + emoji + '</span>';
  return (
    '<div style="min-width:200px;padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">' +
    '<span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:0.5px;padding:3px 9px;border-radius:999px;margin-bottom:8px;background:' + cfg.color + '20;color:' + cfg.color + '">' + cfg.label + '</span>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' + photoHtml +
    '<div><div style="font-size:18px;font-weight:800;color:#111827">' + esc(pin.name || '?') + '</div>' +
    '<div style="font-size:12px;color:#6B7280;margin-top:2px">📍 ' + esc(pin.zone) + '</div></div>' +
    '</div>' +
    '<div style="font-size:11px;color:#9CA3AF;margin-bottom:10px">🕐 Hace ' + esc(pin.time) + '</div>' +
    '<button type="button" data-pin-contact ' +
    'style="display:block;width:100%;padding:9px;border:none;border-radius:8px;font-size:13px;font-weight:700;color:white;cursor:pointer;background:' + cfg.color + '">' +
    cfg.btn + ' — Contactar</button>' +
    '</div>'
  );
}

export default function LeafletMap({
  pins = [],
  userLocation = null,
  centerLat = -53.7873,
  centerLng = -67.7100,
  zoom = 13,
  onPinContact,
  track = null,          // recorrido de avistamientos (buildTrack) — etapa 3
  trackPadding = null,   // [arriba, derecha, abajo, izquierda] px libres de la tarjeta
  dark = false,          // modo rastreo: mapa oscuro
  style,
}) {
  const mapDivRef  = useRef(null);
  const mapRef     = useRef(null);
  const pinsLayer  = useRef(null);
  const userLayer  = useRef(null);
  const trackLayer = useRef(null);
  const [ready, setReady] = useState(false);
  // Último onPinContact sin tener que volver a crear los marcadores
  const onPinContactRef = useRef(onPinContact);
  onPinContactRef.current = onPinContact;

  // 1) Crear el mapa una sola vez
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const L = await loadLeaflet();
        if (!alive || !mapDivRef.current || !L) return;
        // zoomSnap .25: el encuadre del recorrido aprovecha el espacio en vez de
        // saltar al nivel de zoom entero de abajo (los botones +/- siguen de a 1).
        const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: false, zoomSnap: 0.25, zoomDelta: 1 })
          .setView([centerLat, centerLng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        pinsLayer.current = L.layerGroup().addTo(map);
        userLayer.current = L.layerGroup().addTo(map);
        installTrackScript();
        mapRef.current = map;
        setReady(true);
      } catch (err) {
        console.warn('LeafletMap init error:', err);
      }
    })();
    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.stop(); // cortar animaciones de zoom/pan pendientes antes de remover
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Centro / zoom pedidos desde afuera (ej. cuando llega la ubicación del usuario)
  useEffect(() => {
    if (ready && mapRef.current) mapRef.current.setView([centerLat, centerLng], zoom);
  }, [ready, centerLat, centerLng, zoom]);

  // 3) Pines de mascotas: se reemplaza la capa, el mapa queda donde está
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    pinsLayer.current.clearLayers();
    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon(L, pin), title: pin.name || '' })
        .bindPopup(pinPopupHtml(pin), { maxWidth: 260 });
      marker.on('popupopen', () => {
        const btn = marker.getPopup().getElement()?.querySelector('[data-pin-contact]');
        if (!btn) return;
        // onclick (no addEventListener): se reemplaza en cada apertura, no se acumula
        btn.onclick = () => {
          map.closePopup(); // si no, el globo tapa el recorrido que se dibuja al abrir la tarjeta
          onPinContactRef.current?.(pin);
        };
      });
      marker.addTo(pinsLayer.current);
    });
  }, [ready, pins]);

  // 4) Pin del usuario
  useEffect(() => {
    const L = window.L;
    if (!ready || !L) return;
    userLayer.current.clearLayers();
    if (!userLocation) return;
    const userHtml =
      '<div style="display:flex;flex-direction:column;align-items:center">' +
      '<div style="width:48px;height:48px;border-radius:50%;background:#5B4FFF;border:3px solid white;box-shadow:0 4px 12px rgba(91,79,255,0.5);display:flex;align-items:center;justify-content:center;font-size:22px">📱</div>' +
      '</div>';
    L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({ html: userHtml, className: '', iconSize: [48, 48], iconAnchor: [24, 48] }),
    }).bindPopup('<b>📱 Tú estás aquí</b>').addTo(userLayer.current);
  }, [ready, userLocation]);

  // Modo rastreo: mapa oscuro (CSS .mady-dark en mapTrackScript)
  useEffect(() => {
    mapDivRef.current?.classList.toggle('mady-dark', !!dark);
  }, [dark, ready]);

  // 5) Recorrido de avistamientos (etapa 3)
  const lastTrackArgs = useRef(null);
  const drawTrack = () => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map || !window.__madyTrack) return;
    if (trackLayer.current) { trackLayer.current.remove(); trackLayer.current = null; }
    const args = lastTrackArgs.current;
    if (args?.track) trackLayer.current = window.__madyTrack.draw(L, map, args.track, { padding: args.padding });
  };
  useEffect(() => {
    if (!ready) return;
    lastTrackArgs.current = { track, padding: trackPadding };
    mapRef.current?.invalidateSize({ pan: false });
    drawTrack();
  }, [ready, track, trackPadding]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si el contenedor cambia de tamaño (ej. al entrar en modo rastreo se ocultan
  // filtros y leyenda y el mapa crece), Leaflet tiene que recalcular su tamaño;
  // si no, el encuadre del recorrido y el círculo quedan corridos.
  useEffect(() => {
    if (!ready || typeof ResizeObserver === 'undefined' || !mapDivRef.current) return undefined;
    let raf = null;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize({ pan: false });
        if (lastTrackArgs.current?.track) drawTrack(); // re-encuadrar con el tamaño nuevo
      });
    });
    ro.observe(mapDivRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[s.container, style]}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
