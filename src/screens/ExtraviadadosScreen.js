// src/screens/ExtraviadadosScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

// ── Datos de prueba ───────────────────────────────────────────────────────────
const MOCK_LOST = [
  {
    id: '1', name: 'Mady', species: 'Perro', breed: 'Mestiza',
    sex: 'Hembra', zone: 'Centro', color: 'Marrón y blanco',
    date: '01/06/2026', emoji: '🐕',
    description: 'Se escapó del patio. Muy amigable, tiene collar azul.',
  },
  {
    id: '2', name: 'Simón', species: 'Gato', breed: 'Común europeo',
    sex: 'Macho', zone: 'Chacra XII', color: 'Naranja',
    date: '29/05/2026', emoji: '🐈',
    description: 'Gato castrado, muy asustadizo con extraños.',
  },
  {
    id: '3', name: 'Nina', species: 'Perro', breed: 'Caniche',
    sex: 'Hembra', zone: 'Barrio Chacra I', color: 'Blanco',
    date: '28/05/2026', emoji: '🐩',
    description: 'Pequeña, muy nerviosa. Lleva chip.',
  },
  {
    id: '4', name: 'Toro', species: 'Perro', breed: 'Rottweiler',
    sex: 'Macho', zone: 'Los Álamos', color: 'Negro y fuego',
    date: '27/05/2026', emoji: '🐶',
    description: 'Grande pero manso. Tiene tatuaje en oreja izquierda.',
  },
  {
    id: '5', name: 'Luna', species: 'Gato', breed: 'Siamés',
    sex: 'Hembra', zone: 'Aeropuerto', color: 'Crema y café',
    date: '26/05/2026', emoji: '🐱',
    description: 'Ojos celestes. Muy vocalista.',
  },
  {
    id: '6', name: 'Rocky', species: 'Perro', breed: 'Labrador',
    sex: 'Macho', zone: 'Prefectura', color: 'Negro',
    date: '25/05/2026', emoji: '🦮',
    description: 'Muy juguetero. Responde a su nombre.',
  },
];

const FILTERS = ['Todos', 'Perro', 'Gato', 'Otro'];

export default function ExtraviadadosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  const filtered = MOCK_LOST.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.zone.toLowerCase().includes(search.toLowerCase()) ||
      p.breed.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Otro' ? p.species !== 'Perro' && p.species !== 'Gato' : p.species === filter);
    return matchSearch && matchFilter;
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Extraviados 🔍</Text>
          <Text style={styles.subtitle}>{MOCK_LOST.length} mascotas reportadas en Río Grande</Text>
        </View>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('ReportarPerdido')}
          activeOpacity={0.85}
        >
          <Text style={styles.reportBtnText}>+ Reportar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Búsqueda ── */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, barrio o raza..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ fontSize: 16, color: COLORS.textMuted }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filtros ── */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Grilla ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🐾</Text>
            <Text style={styles.emptyText}>No hay resultados</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => {
              // navigation.navigate('DetalleExtraviado', { pet: item })
            }}
          >
            {/* Foto / emoji placeholder */}
            <View style={styles.photoBox}>
              <Text style={styles.photoEmoji}>{item.emoji}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>PERDIDO</Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.petName}>{item.name}</Text>
              <View style={styles.zoneRow}>
                <Text style={styles.zonePin}>📍</Text>
                <Text style={styles.zone}>{item.zone}</Text>
              </View>
              <View style={styles.tagRow}>
                <Tag label={item.species} />
                <Tag label={item.sex} />
              </View>
              <Text style={styles.breed}>{item.breed}</Text>
              <Text style={styles.date}>Desde {item.date}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function Tag({ label }) {
  return (
    <View style={tag.wrap}>
      <Text style={tag.text}>{label}</Text>
    </View>
  );
}

const tag = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.goldPale || '#FFF3DC',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  text: { fontSize: 10, color: COLORS.goldDark || '#8B5E00', fontWeight: '600' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.black,
    fontFamily: 'serif',
  },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  reportBtn: {
    backgroundColor: COLORS.error || '#C0392B',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOW.sm,
  },
  reportBtnText: { color: '#FFF', fontWeight: FONTS.bold, fontSize: FONTS.sm },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 46,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, fontSize: FONTS.base, color: COLORS.black },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive:     { backgroundColor: COLORS.error || '#C0392B', borderColor: COLORS.error || '#C0392B' },
  chipText:       { fontSize: FONTS.sm, color: COLORS.textBody, fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  grid: { paddingHorizontal: SPACING.md, paddingBottom: SPACING['2xl'] },
  row:  { justifyContent: 'space-between', marginBottom: SPACING.md },

  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoBox: {
    height: 120,
    backgroundColor: '#F0EBE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: { fontSize: 56 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.error || '#C0392B',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  info: { padding: SPACING.sm },
  petName: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.black,
    marginBottom: 3,
    fontFamily: 'serif',
  },
  zoneRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  zonePin:  { fontSize: 11 },
  zone:     { fontSize: 11, color: COLORS.textMuted, marginLeft: 2 },
  tagRow:   { flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' },
  breed:    { fontSize: 11, color: COLORS.textBody, marginBottom: 2 },
  date:     { fontSize: 10, color: COLORS.textMuted },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: FONTS.base, color: COLORS.textMuted, marginTop: SPACING.md },
});
