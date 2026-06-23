// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · ExtraviodosScreen — Inspirado en WYDPets + HelpPet
//  Grid de tarjetas con foto, nombre, ubicación y datos del animal
//  Tabs: Perdidos · Encontrados · Adopción
//  Skill ui-ux-pro-max: clean grid, tarjetas con jerarquía visual clara
//  Skill react-native-guidelines: FlatList optimizado, Pressable, StyleSheet
//  Skill frontend-design: paleta cálida, tipografía serif en nombres, sombras suaves
//  Skill accesslint: accessibilityLabel en tarjetas y filtros
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Dimensions, ScrollView, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

const { width: SW } = Dimensions.get('window');
// En web desktop usamos ancho real hasta 960px; en móvil el ancho de pantalla
const FRAME_W = Platform.OS === 'web' ? Math.min(SW, 960) : SW;
const CARD_W = (FRAME_W - SPACING.lg * 2 - SPACING.md) / 2;

// ── Paleta WYDPets-inspired ────────────────────────────────────────────────────
const C = {
  bg:          '#F4F6F8',
  surface:     '#FFFFFF',
  brand:       '#1A6FA8',   // azul WYDPets
  brandLight:  '#E8F4FD',
  found:       '#16A34A',   // verde "encontrado"
  foundBg:     '#F0FDF4',
  lost:        '#DC2626',   // rojo "perdido"
  lostBg:      '#FEF2F2',
  adoption:    '#9333EA',   // violeta "adopción"
  adoptionBg:  '#FAF5FF',
  ink:         '#1A1A2E',
  inkMid:      '#4A5568',
  muted:       '#718096',
  border:      '#E2E8F0',
  borderActive:'#1A6FA8',
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const PETS = [
  {
    id: 'p1', tab: 'lost',
    name: 'Alfonso', species: 'Perro', breed: 'Chihuahua',
    gender: 'Macho', age: '2 años', color: 'Marrón y blanco',
    zone: 'Vicente López', date: '02/06/2026',
    emoji: '🐕', bg: '#FFF8E1', urgent: true,
    desc: 'Collar rojo, muy amigable con las personas.',
  },
  {
    id: 'p2', tab: 'found',
    name: 'Lavanda', species: 'Gato', breed: '-',
    gender: 'Hembra', age: 'Adulto', color: 'Tricolor',
    zone: 'Constitución', date: '01/06/2026',
    emoji: '🐱', bg: '#E8F4FD', urgent: false,
    desc: 'Encontrada cerca del parque, sin collar.',
  },
  {
    id: 'p3', tab: 'found',
    name: 'Perrita', species: 'Perro', breed: 'Mestizo',
    gender: 'Hembra', age: 'Joven', color: 'Gris',
    zone: 'Quilmes', date: '31/05/2026',
    emoji: '🐩', bg: '#F5F5F5', urgent: false,
    desc: 'Muy nerviosa, necesita contacto suave.',
  },
  {
    id: 'p4', tab: 'found',
    name: 'Pedro', species: 'Perro', breed: 'Mestizo',
    gender: 'Macho', age: '3 años', color: 'Negro',
    zone: '11 de Septiembre', date: '30/05/2026',
    emoji: '🐶', bg: '#FFF3E0', urgent: false,
    desc: 'Encontrado en la calle, asustado pero sano.',
  },
  {
    id: 'p5', tab: 'lost',
    name: 'Toby', species: 'Perro', breed: 'Golden Retriever',
    gender: 'Macho', age: '4 años', color: 'Dorado',
    zone: 'Del Valle, CDMX', date: '03/06/2026',
    emoji: '🐕', bg: '#FFFBEB', urgent: true,
    desc: 'Collar azul marino. Recompensa $1,000.',
  },
  {
    id: 'p6', tab: 'adoption',
    name: 'Mochi', species: 'Gato', breed: 'Persa',
    gender: 'Hembra', age: '1 año', color: 'Blanco',
    zone: 'Palermo', date: '28/05/2026',
    emoji: '🐱', bg: '#FAF5FF', urgent: false,
    desc: 'Vacunada y desparasitada. Busca hogar.',
  },
  {
    id: 'p7', tab: 'adoption',
    name: 'Thor', species: 'Perro', breed: 'Labrador',
    gender: 'Macho', age: '2 años', color: 'Negro',
    zone: 'Belgrano', date: '27/05/2026',
    emoji: '🐕‍🦺', bg: '#F0F4FF', urgent: false,
    desc: 'Castrado, chip, excelente con niños.',
  },
  {
    id: 'p8', tab: 'lost',
    name: 'Luna', species: 'Gato', breed: 'Siamés',
    gender: 'Hembra', age: '3 años', color: 'Crema y café',
    zone: 'Roma Norte, CDMX', date: '04/06/2026',
    emoji: '😺', bg: '#FFF0F5', urgent: true,
    desc: 'Ojos azules, sin collar, muy tímida.',
  },
];

const TABS = [
  { key: 'lost',     label: 'Perdidos',    icon: '🔴', count: PETS.filter(p => p.tab === 'lost').length },
  { key: 'found',    label: 'Encontrados', icon: '🟢', count: PETS.filter(p => p.tab === 'found').length },
  { key: 'adoption', label: 'Adopción',    icon: '🟣', count: PETS.filter(p => p.tab === 'adoption').length },
];

const SPECIES_FILTERS = ['Todos', 'Perro', 'Gato', 'Conejo', 'Ave'];

// ── PetCard ───────────────────────────────────────────────────────────────────
// react-native-guidelines: memoized, Pressable, StyleSheet
const PetCard = React.memo(function PetCard({ pet, tab, onPress }) {
  const accentColor = tab === 'lost' ? C.lost : tab === 'found' ? C.found : C.adoption;
  const accentBg    = tab === 'lost' ? C.lostBg : tab === 'found' ? C.foundBg : C.adoptionBg;

  return (
    <Pressable
      style={({ pressed }) => [
        cs.card,
        { borderColor: pressed ? accentColor : C.border },
        pressed && cs.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${pet.species} ${pet.gender}, ${pet.zone}`}
      accessibilityHint="Toca para ver más información y contactar"
    >
      {/* Foto / placeholder */}
      <View style={[cs.photoWrap, { backgroundColor: pet.bg }]}>
        <Text style={cs.photoEmoji}>{pet.emoji}</Text>
        {/* Badge urgente */}
        {pet.urgent && (
          <View style={cs.urgentBadge}>
            <Text style={cs.urgentText}>URGENTE</Text>
          </View>
        )}
        {/* Badge de fecha */}
        <View style={[cs.dateBadge, { backgroundColor: 'rgba(0,0,0,0.48)' }]}>
          <Text style={cs.dateText}>{pet.date}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={cs.info}>
        {/* Nombre — frontend-design: serif para nombres, da calidez */}
        <Text style={cs.name} numberOfLines={1}>{pet.name}</Text>

        {/* Ubicación */}
        <View style={cs.locationRow}>
          <Text style={cs.locationPin}>📍</Text>
          <Text style={cs.locationText} numberOfLines={1}>{pet.zone}</Text>
        </View>

        {/* Grid de datos (estilo WYDPets) */}
        <View style={cs.dataGrid}>
          <DataCell label="Mascota" value={pet.species} />
          <DataCell label="Sexo"    value={pet.gender} />
        </View>
        <View style={cs.dataGrid}>
          <DataCell label="Raza"    value={pet.breed} />
          <DataCell label="Edad"    value={pet.age} />
        </View>

        {/* Botón contactar */}
        <Pressable
          style={[cs.contactBtn, { backgroundColor: accentColor }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Contactar sobre ${pet.name}`}
        >
          <Text style={cs.contactText}>
            {tab === 'lost' ? 'Lo vi' : tab === 'found' ? 'Es mío' : 'Adoptar'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

function DataCell({ label, value }) {
  return (
    <View style={cs.dataCell}>
      <Text style={cs.dataCellLabel}>{label}</Text>
      <Text style={cs.dataCellValue}>{value || '-'}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  cardPressed: { opacity: 0.93, transform: [{ scale: 0.98 }] },

  photoWrap: {
    width: '100%', height: CARD_W * 0.9,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  photoEmoji: { fontSize: CARD_W * 0.38 },

  urgentBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: C.lost, borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  urgentText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  dateBadge: {
    position: 'absolute', bottom: 6, right: 6,
    borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  dateText: { fontSize: 9, color: '#FFF', fontWeight: '500' },

  info: { padding: SPACING.sm + 2 },

  name: {
    fontSize: FONTS.md, fontWeight: '800', color: C.brand,
    fontFamily: 'Georgia', marginBottom: 4,
  },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  locationPin: { fontSize: 11 },
  locationText:{ fontSize: FONTS.xs, color: C.inkMid, flex: 1, fontWeight: '500' },

  dataGrid:     { flexDirection: 'row', gap: SPACING.xs, marginBottom: 4 },
  dataCell:     { flex: 1 },
  dataCellLabel:{ fontSize: 9, color: C.brand, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  dataCellValue:{ fontSize: FONTS.xs, color: C.ink, fontWeight: '500', marginTop: 1 },

  contactBtn: {
    marginTop: SPACING.sm, borderRadius: RADIUS.full,
    paddingVertical: 7, alignItems: 'center',
  },
  contactText: { fontSize: FONTS.xs, fontWeight: '700', color: '#FFF' },
});

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function ExtraviodosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab,    setActiveTab]    = useState('lost');
  const [speciesFilter,setSpeciesFilter] = useState('Todos');
  const [search,       setSearch]       = useState('');
  const [showFilters,  setShowFilters]  = useState(false);

  // react-native-guidelines: callbacks estables con useCallback
  const filtered = useMemo(() => PETS.filter(p => {
    const okTab     = p.tab === activeTab;
    const okSpecies = speciesFilter === 'Todos' || p.species === speciesFilter;
    const okSearch  = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.zone.toLowerCase().includes(search.toLowerCase());
    return okTab && okSpecies && okSearch;
  }), [activeTab, speciesFilter, search]);

  const handleContact = useCallback((pet) => {
    Alert.alert(
      `${pet.name} — ${pet.zone}`,
      `${pet.desc}\n\nContactar al dueño/rescatista para más información.`,
      [
        { text: 'Cerrar', style: 'cancel' },
        { text: '📞 Contactar', onPress: () => Alert.alert('Próximamente', 'Chat integrado disponible en v2') },
      ]
    );
  }, []);

  // react-native-guidelines: renderItem memoizado
  const renderItem = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? gr.leftCol : gr.rightCol}>
      <PetCard pet={item} tab={activeTab} onPress={() => handleContact(item)} />
    </View>
  ), [activeTab, handleContact]);

  const keyExtractor = useCallback((item) => item.id, []);

  const activeTabData = TABS.find(t => t.key === activeTab);
  const accentColor   = activeTab === 'lost' ? C.lost : activeTab === 'found' ? C.found : C.adoption;
  const accentBg      = activeTab === 'lost' ? C.lostBg : activeTab === 'found' ? C.foundBg : C.adoptionBg;

  return (
    <View style={[scr.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={scr.header}>
        <View>
          <Text style={scr.title}>{activeTabData?.label}</Text>
          <Text style={scr.subtitle}>
            {filtered.length} mascota{filtered.length !== 1 ? 's' : ''}
            {activeTab === 'lost' ? ' buscando hogar' : activeTab === 'found' ? ' esperando a su dueño' : ' en adopción'}
          </Text>
        </View>
        <Pressable
          style={scr.reportBtn}
          onPress={() => navigation.navigate('Reportar')}
          accessibilityRole="button"
          accessibilityLabel="Reportar una mascota"
        >
          <Text style={scr.reportBtnText}>＋ Reportar</Text>
        </Pressable>
      </View>

      {/* ── Tabs (estilo WYDPets) ── */}
      <View style={scr.tabBar}>
        {TABS.map(tab => {
          const active = tab.key === activeTab;
          const tc     = tab.key === 'lost' ? C.lost : tab.key === 'found' ? C.found : C.adoption;
          return (
            <Pressable
              key={tab.key}
              style={[scr.tab, active && { borderBottomColor: tc, borderBottomWidth: 3 }]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label}, ${tab.count} mascotas`}
              accessibilityState={{ selected: active }}
            >
              <View style={[scr.tabBadge, active && { backgroundColor: tc + '18' }]}>
                <Text style={scr.tabIcon}>{tab.icon}</Text>
                <Text style={[scr.tabLabel, active && { color: tc, fontWeight: '700' }]}>
                  {tab.label}
                </Text>
                <View style={[scr.tabCount, { backgroundColor: active ? tc : C.border }]}>
                  <Text style={[scr.tabCountText, { color: active ? '#FFF' : C.muted }]}>
                    {tab.count}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Buscador + filtros ── */}
      <View style={scr.searchRow}>
        <View style={scr.searchBox}>
          <Text style={{ fontSize: 15 }}>🔍</Text>
          <TextInput
            style={scr.searchInput}
            placeholder="Buscar por nombre o zona..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Buscar mascotas"
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ color: C.muted, fontSize: 16 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[scr.filterBtn, showFilters && { backgroundColor: C.brandLight, borderColor: C.brand }]}
          onPress={() => setShowFilters(v => !v)}
          accessibilityRole="button"
          accessibilityLabel="Abrir filtros de especie"
          accessibilityState={{ expanded: showFilters }}
        >
          <Text style={[scr.filterBtnText, showFilters && { color: C.brand }]}>
            Filtros ▾
          </Text>
        </Pressable>
      </View>

      {/* ── Filtros de especie ── */}
      {showFilters && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={scr.filterChips}
          style={scr.filterRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por especie"
        >
          {SPECIES_FILTERS.map(sp => (
            <Pressable
              key={sp}
              style={[scr.chip, speciesFilter === sp && { backgroundColor: C.brand, borderColor: C.brand }]}
              onPress={() => setSpeciesFilter(sp)}
              accessibilityRole="radio"
              accessibilityLabel={sp}
              accessibilityState={{ checked: speciesFilter === sp }}
            >
              <Text style={[scr.chipText, speciesFilter === sp && { color: '#FFF' }]}>{sp}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── Hero banner del tab activo ── */}
      <View style={[scr.heroBanner, { backgroundColor: accentBg }]}>
        <Text style={scr.heroBannerIcon}>
          {activeTab === 'lost' ? '🔴' : activeTab === 'found' ? '🟢' : '🟣'}
        </Text>
        <Text style={[scr.heroBannerText, { color: accentColor }]}>
          {activeTab === 'lost'
            ? '¡Ayuda a encontrarlos! Contacta si los ves cerca de ti.'
            : activeTab === 'found'
            ? '¿Los reconoces? Contáctanos para reunirlos con su dueño.'
            : 'Dale un hogar lleno de amor a alguno de estos peludos.'}
        </Text>
      </View>

      {/* ── Grid de tarjetas (estilo WYDPets 2 columnas) ── */}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={gr.row}
        contentContainerStyle={gr.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState tab={activeTab} accentColor={accentColor} />}
        // react-native-guidelines: list performance
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
        getItemLayout={(_, index) => ({
          length: CARD_W * 1.4 + SPACING.md,
          offset: (CARD_W * 1.4 + SPACING.md) * Math.floor(index / 2),
          index,
        })}
      />
    </View>
  );
}

function EmptyState({ tab, accentColor }) {
  const msgs = {
    lost:     { emoji: '🔍', text: 'No hay mascotas perdidas reportadas en este momento.' },
    found:    { emoji: '📍', text: 'No hay mascotas encontradas en este momento.' },
    adoption: { emoji: '❤️', text: 'No hay mascotas en adopción por ahora.' },
  };
  const m = msgs[tab];
  return (
    <View style={empty.wrap}>
      <Text style={empty.emoji}>{m.emoji}</Text>
      <Text style={[empty.text, { color: accentColor }]}>{m.text}</Text>
    </View>
  );
}

const gr = StyleSheet.create({
  list:     { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  row:      { justifyContent: 'space-between', gap: SPACING.md },
  leftCol:  {},
  rightCol: {},
});

const empty = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingVertical: 60, gap: SPACING.md },
  emoji: { fontSize: 52 },
  text:  { fontSize: FONTS.base, textAlign: 'center', fontWeight: '600', opacity: 0.7 },
});

const scr = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title:   { fontSize: FONTS['2xl'], fontWeight: '800', color: C.ink },
  subtitle:{ fontSize: FONTS.xs, color: C.muted, marginTop: 2 },
  reportBtn: {
    backgroundColor: C.brand, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  reportBtnText: { color: '#FFF', fontSize: FONTS.xs, fontWeight: '700' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.sm + 2,
    alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  tabIcon:      { fontSize: 11 },
  tabLabel:     { fontSize: FONTS.sm, color: C.muted, fontWeight: '500' },
  tabCount: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  tabCountText: { fontSize: 9, fontWeight: '800' },

  // Search
  searchRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: C.bg, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: C.border,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: FONTS.sm, color: C.ink },
  filterBtn: {
    height: 40, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnText: { fontSize: FONTS.sm, color: C.muted, fontWeight: '600' },

  // Species chips
  filterRow:  { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  filterChips:{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipText: { fontSize: FONTS.xs, color: C.inkMid, fontWeight: '500' },

  // Hero banner
  heroBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2,
  },
  heroBannerIcon: { fontSize: 14 },
  heroBannerText: { flex: 1, fontSize: FONTS.xs, fontWeight: '600', lineHeight: 16 },
});
