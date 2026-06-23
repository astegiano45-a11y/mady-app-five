import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function formatTime(ts) {
  const diff = (Date.now() - new Date(ts)) / 60000;
  if (diff < 60) return `hace ${Math.round(diff)} min`;
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
  return `hace ${Math.floor(diff / 1440)} días`;
}

const TYPE_CONFIG = {
  lost:     { emoji: '🚨', label: 'Mascota perdida',    color: C.lost,  bg: '#FEE2E2' },
  found:    { emoji: '🟢', label: 'Mascota encontrada', color: C.found, bg: '#DCFCE7' },
  adoption: { emoji: '🏠', label: 'En adopción',        color: C.teal,  bg: C.tealLight },
  sos:      { emoji: '📣', label: 'Alerta SOS',         color: C.lost,  bg: '#FEE2E2' },
};

export default function NotificacionesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const [alertas, setAlertas]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('alertas')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(30);
        setAlertas(data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handlePress = (item) => {
    if (item.type === 'lost' || item.type === 'found' || item.type === 'adoption') {
      navigation.navigate('Mapa');
    }
  };

  const renderItem = ({ item }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.lost;
    return (
      <TouchableOpacity style={s.row} onPress={() => handlePress(item)} activeOpacity={0.75}>
        <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {cfg.label}: <Text style={[s.rowName, { color: cfg.color }]}>{item.name || 'Sin nombre'}</Text>
          </Text>
          <Text style={s.rowSub}>{item.zone || 'Río Grande'} · {formatTime(item.created_at)}</Text>
          {item.description ? (
            <Text style={s.rowDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
        <View style={[s.dot, { backgroundColor: cfg.color }]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notificaciones</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.teal} size="large" />
        </View>
      ) : alertas.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>🔔</Text>
          <Text style={s.emptyTxt}>No hay notificaciones</Text>
          <Text style={s.emptySub}>Cuando haya actividad en tu zona aparecerá acá</Text>
        </View>
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.divider} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cloud },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: S[16], backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  back:   { padding: 4 },
  backTxt:{ fontSize: 32, color: C.teal, lineHeight: 36 },
  title:  { fontSize: T.xl, fontWeight: '800', color: C.ink },

  list:   { paddingBottom: 100 },
  divider:{ height: 1, backgroundColor: C.border, marginLeft: 72 },

  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: S[16], backgroundColor: C.white },
  iconWrap:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowTitle:{ fontSize: T.sm, fontWeight: '700', color: C.ink },
  rowName: { fontWeight: '800' },
  rowSub:  { fontSize: T.xs, color: C.inkLight, marginTop: 2 },
  rowDesc: { fontSize: T.xs, color: C.inkMid, marginTop: 3, lineHeight: 16 },
  dot:     { width: 8, height: 8, borderRadius: 4 },

  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: S[32] },
  emptyTxt: { fontSize: T.lg, fontWeight: '700', color: C.ink, textAlign: 'center' },
  emptySub: { fontSize: T.sm, color: C.inkLight, textAlign: 'center' },
});
