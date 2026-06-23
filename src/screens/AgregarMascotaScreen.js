import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, Check, Dog } from 'lucide-react-native';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { crearMascota, subirFotoMascota } from '../services/mascotasService';
import { supabase } from '../lib/supabase';

const SPECIES  = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro'];
const SPECIES_EMOJI = { Perro:'🐕', Gato:'🐱', Conejo:'🐇', Ave:'🦜', Otro:'🐾' };

async function uploadFotoMascota(uri, base64) {
  const path = `mascotas/${Date.now()}.jpg`;
  if (Platform.OS === 'web' || base64) {
    const byteChars = atob(base64);
    const byteNums  = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });
    const { error } = await supabase.storage.from('mascotas').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } else {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const { error } = await supabase.storage.from('mascotas').upload(path, blob, { upsert: true });
    if (error) throw error;
  }
  return supabase.storage.from('mascotas').getPublicUrl(path).data.publicUrl;
}

export default function AgregarMascotaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name,     setName]     = useState('');
  const [species,  setSpecies]  = useState('Perro');
  const [breed,    setBreed]    = useState('');
  const [age,      setAge]      = useState('');
  const [color,    setColor]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [photo,    setPhoto]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
    });
    if (!result.canceled) setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    setError('');
    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) {
        try { photoUrl = await uploadFotoMascota(photo.uri, photo.base64); } catch {}
      }
      await crearMascota({
        name:        name.trim(),
        species:     species.toLowerCase(),
        breed:       breed.trim(),
        age:         age.trim(),
        color:       color.trim(),
        description: desc.trim(),
        photo_url:   photoUrl,
        status:      'home',
      });
      setDone(true);
    } catch (e) {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <View style={s.doneCircle}>
          <Check size={48} color={C.white} strokeWidth={3} />
        </View>
        <Text style={s.doneTitle}>¡{name} ya está en Mady!</Text>
        <Text style={s.doneSub}>Tu mascota quedó registrada y protegida.</Text>
        <TouchableOpacity style={[s.doneBtn, { backgroundColor: C.teal }]} onPress={() => navigation.goBack()}>
          <Text style={s.doneBtnTxt}>Ver mis mascotas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Agregar mascota</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto */}
        <TouchableOpacity style={s.photoPicker} onPress={pickPhoto}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={s.photoImg} resizeMode="cover" />
          ) : (
            <View style={s.photoPlaceholder}>
              <Text style={s.photoEmoji}>{SPECIES_EMOJI[species]}</Text>
              <Camera size={20} color={C.inkMuted} strokeWidth={1.5} />
              <Text style={s.photoHint}>Agregar foto</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Especie */}
        <Text style={s.label}>Especie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: S[16] }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {SPECIES.map(sp => (
              <TouchableOpacity
                key={sp}
                style={[s.chip, species === sp && { backgroundColor: C.teal, borderColor: C.teal }]}
                onPress={() => setSpecies(sp)}
              >
                <Text style={s.chipEmoji}>{SPECIES_EMOJI[sp]}</Text>
                <Text style={[s.chipTxt, species === sp && { color: C.white }]}>{sp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Nombre */}
        <Text style={s.label}>Nombre *</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Luna, Milo, Canelo..."
          placeholderTextColor={C.inkMuted}
          value={name} onChangeText={setName}
        />

        {/* Raza + Edad */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Raza</Text>
            <TextInput style={s.input} placeholder="Golden Retriever" placeholderTextColor={C.inkMuted} value={breed} onChangeText={setBreed} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Edad</Text>
            <TextInput style={s.input} placeholder="2 años" placeholderTextColor={C.inkMuted} value={age} onChangeText={setAge} />
          </View>
        </View>

        {/* Color */}
        <Text style={s.label}>Color</Text>
        <TextInput style={s.input} placeholder="Dorado, negro, blanco..." placeholderTextColor={C.inkMuted} value={color} onChangeText={setColor} />

        {/* Descripción */}
        <Text style={s.label}>Descripción (opcional)</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
          placeholder="Señas particulares, collar, comportamiento..."
          placeholderTextColor={C.inkMuted}
          value={desc} onChangeText={setDesc}
          multiline numberOfLines={3}
        />

        {error ? <Text style={s.errorTxt}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.saveBtn, !name.trim() && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={loading || !name.trim()}
        >
          {loading
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.saveBtnTxt}>Guardar mascota</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S[16], paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: T.lg, fontWeight: '700', color: C.ink },

  scroll: { padding: S[20], backgroundColor: C.cloud },

  photoPicker: {
    width: 120, height: 120, borderRadius: 60,
    alignSelf: 'center', marginBottom: S[24],
    overflow: 'hidden', borderWidth: 2, borderColor: C.border,
    borderStyle: 'dashed',
  },
  photoImg:         { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.cloudMid },
  photoEmoji:       { fontSize: 32 },
  photoHint:        { fontSize: 10, color: C.inkMuted, fontWeight: '600' },

  label: { fontSize: T.sm, fontWeight: '600', color: C.inkMid, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: C.white, borderRadius: R.xl,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: S[16], paddingVertical: 12,
    fontSize: T.base, color: C.ink, marginBottom: S[12],
  },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: R.full, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
  },
  chipEmoji: { fontSize: 16 },
  chipTxt:   { fontSize: T.sm, fontWeight: '600', color: C.inkMid },

  errorTxt: { fontSize: T.sm, color: C.lost, marginBottom: S[8] },

  saveBtn: {
    backgroundColor: C.teal, paddingVertical: 16,
    borderRadius: R['2xl'], alignItems: 'center', marginTop: S[8],
  },
  saveBtnTxt: { fontSize: T.base, fontWeight: '800', color: C.white },

  // Done state
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S[32], backgroundColor: C.cloud },
  doneCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', marginBottom: S[24] },
  doneTitle:  { fontSize: T['2xl'], fontWeight: '800', color: C.ink, marginBottom: S[8] },
  doneSub:    { fontSize: T.base, color: C.inkLight, textAlign: 'center', marginBottom: S[32] },
  doneBtn:    { paddingVertical: 16, paddingHorizontal: 40, borderRadius: R['2xl'] },
  doneBtnTxt: { fontSize: T.base, fontWeight: '800', color: C.white },
});
