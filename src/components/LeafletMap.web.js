// LeafletMap.web.js — Versión web que carga Leaflet directamente en el DOM
// Expo resuelve .web.js automáticamente en plataforma web

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TRACK_SCRIPT } from './mapTrackScript';

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

import { LEAFLET_CSS, LEAFLET_JS, loadScript, loadStyle } from './leafletLoader.web';

const TYPE_CFG = {
  lost:     { color: '#DC2626', label: 'PERDIDO',    btn: 'Lo vi' },
  found:    { color: '#16A34A', label: 'ENCONTRADO', btn: 'Es mío' },
  adoption: { color: '#9333EA', label: 'ADOPCIÓN',   btn: 'Adoptar' },
};

export default function LeafletMap({
  pins = [],
  userLocation = null,
  centerLat = -53.7873,
  centerLng = -67.7100,
  zoom = 13,
  onPinContact,
  track = null,          // recorrido de avistamientos (buildTrack) — etapa 3
  trackPadding = null,   // [arriba, derecha, abajo, izquierda] px libres de la tarjeta
  style,
}) {
  const mapDivRef = useRef(null);
  const mapRef    = useRef(null);
  const trackRef  = useRef(null);
  // Se incrementa cada vez que se (re)crea el mapa, para redibujar el recorrido
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      try {
        loadStyle(LEAFLET_CSS);
        await loadScript(LEAFLET_JS);
        if (!mounted || !mapDivRef.current) return;

        const L = window.L;
        if (!L) return;

        // Destruir instancia anterior si existe
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(mapDivRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([centerLat, centerLng], zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        trackRef.current = null;
        installTrackScript();
        setMapVersion((v) => v + 1);

        // Pin de usuario
        if (userLocation) {
          const userHtml =
            '<div style="display:flex;flex-direction:column;align-items:center">' +
            '<div style="width:48px;height:48px;border-radius:50%;background:#5B4FFF;border:3px solid white;box-shadow:0 4px 12px rgba(91,79,255,0.5);display:flex;align-items:center;justify-content:center;font-size:22px">📱</div>' +
            '</div>';
          L.marker([userLocation.lat, userLocation.lng], {
            icon: L.divIcon({ html: userHtml, className: '', iconSize: [48, 48], iconAnchor: [24, 48] }),
          }).addTo(map).bindPopup('<b>📱 Tú estás aquí</b>');
        }

        // Pines de mascotas
        pins.forEach(function(pin) {
          const cfg   = TYPE_CFG[pin.type] || TYPE_CFG.lost;
          const emoji = pin.type === 'found' ? '🐾' : pin.type === 'adoption' ? '❤️' : '🐕';

          // Ícono del marcador
          const innerContent = (pin.photo && pin.photo.startsWith('https'))
            ? '<img style="width:42px;height:42px;border-radius:50%;object-fit:cover" src="' + pin.photo + '" onerror="this.style.display=\'none\'">'
            : emoji;

          const iconHtml =
            '<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">' +
            '<div style="width:48px;height:48px;border-radius:50%;background:' + cfg.color + ';border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden">' +
            innerContent +
            '</div>' +
            '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ' + cfg.color + ';margin-top:-1px"></div>' +
            '</div>';

          const icon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [48, 62],
            iconAnchor: [24, 62],
          });

          const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);

          // Popup al tocar el marcador
          const photoHtml = (pin.photo && pin.photo.startsWith('https'))
            ? '<img style="width:50px;height:50px;border-radius:50%;object-fit:cover;flex-shrink:0" src="' + pin.photo + '">'
            : '<span style="font-size:32px">' + emoji + '</span>';

          const popupHtml =
            '<div style="min-width:200px;padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">' +
            '<span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:0.5px;padding:3px 9px;border-radius:999px;margin-bottom:8px;background:' + cfg.color + '20;color:' + cfg.color + '">' + cfg.label + '</span>' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
            photoHtml +
            '<div><div style="font-size:18px;font-weight:800;color:#111827">' + (pin.name || '?') + '</div>' +
            '<div style="font-size:12px;color:#6B7280;margin-top:2px">📍 ' + (pin.zone || '') + '</div></div>' +
            '</div>' +
            '<div style="font-size:11px;color:#9CA3AF;margin-bottom:10px">🕐 Hace ' + (pin.time || '') + '</div>' +
            '<button onclick="this.dispatchEvent(new CustomEvent(\'pin-contact\',{bubbles:true,detail:' + JSON.stringify(pin).replace(/"/g, '&quot;') + '}))" ' +
            'style="display:block;width:100%;padding:9px;border:none;border-radius:8px;font-size:13px;font-weight:700;color:white;cursor:pointer;background:' + cfg.color + '">' +
            cfg.btn + ' — Contactar</button>' +
            '</div>';

          marker.bindPopup(popupHtml, { maxWidth: 260 });

          marker.on('popupopen', function() {
            const container = marker.getPopup().getElement();
            if (!container) return;
            container.addEventListener('pin-contact', function(e) {
              // Cerrar el globo: si no, tapa el recorrido que se dibuja al abrir la tarjeta
              map.closePopup();
              if (onPinContact) onPinContact(e.detail);
            });
          });
        });

      } catch (err) {
        console.warn('LeafletMap init error:', err);
      }
    }

    initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pins, userLocation, centerLat, centerLng, zoom]);

  // Recorrido de avistamientos: se dibuja en su propia capa, sin recrear el mapa
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !window.__madyTrack) return;
    if (trackRef.current) { trackRef.current.remove(); trackRef.current = null; }
    if (track) {
      trackRef.current = window.__madyTrack.draw(L, map, track, { padding: trackPadding });
    }
  }, [track, trackPadding, mapVersion]);

  return (
    <View style={[s.container, style]}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
