// ─────────────────────────────────────────────────────────────────────────────
//  LeafletMap — Mapa real con OpenStreetMap + Leaflet.js via WebView
//  Funciona en web, iOS y Android
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const TYPE_COLORS = {
  lost:     '#DC2626',
  found:    '#16A34A',
  adoption: '#9333EA',
  user:     '#5B4FFF',
};

// Genera el HTML completo con Leaflet incrustado
function buildLeafletHTML({ pins, userLat, userLng, centerLat, centerLng, zoom }) {
  const pinsJson = JSON.stringify(pins.map(p => ({
    id: p.id, type: p.type || 'lost',
    name: String(p.name || '?'),
    lat: p.lat, lng: p.lng,
    zone: String(p.zone || ''),
    time: String(p.time || ''),
    emoji: p.type === 'found' ? '🐾' : p.type === 'adoption' ? '❤️' : '🐕',
    photo: (typeof p.photo === 'string' && p.photo.startsWith('https')) ? p.photo : null,
  })));
  const ul = userLat  || centerLat;
  const ug = userLng  || centerLng;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-pin {
      display: flex; flex-direction: column;
      align-items: center; cursor: pointer;
    }
    .pin-bubble {
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 20px;
      transition: transform 0.15s ease;
      overflow: hidden;
    }
    .pin-tip {
      width: 0; height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top-width: 10px; border-top-style: solid;
      margin-top: -1px;
    }
    .pin-user .pin-bubble {
      background: #5B4FFF; width: 48px; height: 48px;
      font-size: 22px; border: 4px solid white;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0   rgba(91,79,255,0.5); }
      70%  { box-shadow: 0 0 0 16px rgba(91,79,255,0);   }
      100% { box-shadow: 0 0 0 0   rgba(91,79,255,0);   }
    }
    .leaflet-popup-content-wrapper {
      border-radius: 14px !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
      padding: 0 !important;
      overflow: hidden;
    }
    .leaflet-popup-content { margin: 0 !important; }
    .popup-card {
      min-width: 200px; padding: 14px 16px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .popup-badge {
      display: inline-block; font-size: 10px; font-weight: 800;
      letter-spacing: 0.5px; padding: 3px 9px;
      border-radius: 999px; margin-bottom: 8px;
    }
    .popup-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .popup-emoji { font-size: 32px; }
    .popup-name { font-size: 18px; font-weight: 800; color: #111827; font-family: Georgia, serif; }
    .popup-zone { font-size: 12px; color: #6B7280; margin-top: 2px; }
    .popup-time { font-size: 11px; color: #9CA3AF; margin-top: 8px; }
    .popup-btn {
      display: block; width: 100%; margin-top: 10px;
      padding: 9px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 700; color: white;
      cursor: pointer; text-align: center;
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var pins    = ${pinsJson};
  var typeCfg = {
    lost:     { color: '#DC2626', label: 'PERDIDO',    btn: 'Lo vi' },
    found:    { color: '#16A34A', label: 'ENCONTRADO', btn: 'Es mío' },
    adoption: { color: '#9333EA', label: 'ADOPCIÓN',   btn: 'Adoptar' },
  };

  // Inicializar mapa
  var map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([${centerLat}, ${centerLng}], ${zoom});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Función para crear ícono
  function makeIcon(pin) {
    var cfg = typeCfg[pin.type] || typeCfg.lost;
    var content;
    if (pin.photo) {
      content = '<img style="width:42px;height:42px;border-radius:50%;object-fit:cover;" src="' + pin.photo + '" onerror="this.outerHTML=\'' + pin.emoji + '\'">';
    } else {
      content = pin.emoji;
    }
    var html = '<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">'
      + '<div style="width:48px;height:48px;border-radius:50%;background:' + cfg.color + ';border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden">'
      + content
      + '</div>'
      + '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ' + cfg.color + ';margin-top:-1px"></div>'
      + '</div>';
    return L.divIcon({ html: html, className: '', iconSize: [48, 62], iconAnchor: [24, 62] });
  }

  function makeUserIcon() {
    var html = '<div class="custom-pin pin-user"><div class="pin-bubble">📱</div></div>';
    return L.divIcon({ html: html, className: '', iconSize: [48, 52], iconAnchor: [24, 52] });
  }

  // Agregar pins de mascotas
  pins.forEach(function(pin) {
    var cfg = typeCfg[pin.type] || typeCfg.lost;
    var marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(pin) }).addTo(map);

    var popupHtml =
      '<div class="popup-card">' +
        '<span class="popup-badge" style="background:' + cfg.color + '20;color:' + cfg.color + '">' + cfg.label + '</span>' +
        '<div class="popup-row">' +
          (pin.photo
            ? '<img style="width:50px;height:50px;border-radius:50%;object-fit:cover;flex-shrink:0" src="' + pin.photo + '">'
            : '<span class="popup-emoji">' + pin.emoji + '</span>') +
          '<div>' +
            '<div class="popup-name">' + pin.name + '</div>' +
            '<div class="popup-zone">📍 ' + pin.zone + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="popup-time">🕐 Hace ' + pin.time + '</div>' +
        '<button class="popup-btn" style="background:' + cfg.color + '" ' +
          'onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({action:\\'contact\\',pin:' + JSON.stringify(JSON.stringify(pin)) + '}))">' +
          cfg.btn + ' — Contactar' +
        '</button>' +
      '</div>';

    marker.bindPopup(popupHtml, { maxWidth: 240 });
  });

  // Pin de usuario
  if (${!!userLat}) {
    L.marker([${ul}, ${ug}], { icon: makeUserIcon() })
      .addTo(map)
      .bindPopup('<div class="popup-card"><b>📱 Tú estás aquí</b></div>');
  }

  // Notificar listo
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'ready' }));
  }
</script>
</body>
</html>`;
}

// ── Web iframe map ────────────────────────────────────────────────────────────
function LeafletMapWeb({ pins, userLocation, centerLat, centerLng, zoom, onPinContact, style }) {
  const html = buildLeafletHTML({
    pins,
    userLat: userLocation?.lat,
    userLng: userLocation?.lng,
    centerLat,
    centerLng,
    zoom,
  });

  return (
    <View style={[styles.container, style]}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Mapa Mady"
      />
    </View>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LeafletMap({
  pins = [],
  userLocation = null,
  centerLat = 19.4326,
  centerLng = -99.1332,
  zoom = 13,
  onPinContact,
  style,
}) {
  // En web, usar iframe directamente
  if (Platform.OS === 'web') {
    return (
      <LeafletMapWeb
        pins={pins}
        userLocation={userLocation}
        centerLat={centerLat}
        centerLng={centerLng}
        zoom={zoom}
        onPinContact={onPinContact}
        style={style}
      />
    );
  }

  // En iOS/Android, usar WebView
  const webviewRef = useRef(null);
  const html = buildLeafletHTML({ pins, userLat: userLocation?.lat, userLng: userLocation?.lng, centerLat, centerLng, zoom });

  const handleMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.action === 'contact' && onPinContact) {
        const pin = JSON.parse(msg.pin);
        onPinContact(pin);
      }
    } catch {}
  }, [onPinContact]);

  const WebView = require('react-native-webview').WebView;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        mixedContentMode="always"
        allowsInlineMediaPlayback
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: '#EEF2F7' },
});
