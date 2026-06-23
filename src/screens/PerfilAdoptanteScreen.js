import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { getAdoptantProfile, createAdoptantProfile, updateAdoptantProfile } from '../services/adoptantService';

function RadioGroup({ label, options, value, onChange }) {
  return (
    <View style={st.group}>
      <Text style={st.label}>{label}</Text>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.id}
          style={st.radioRow}
          onPress={() => onChange(opt.id)}
        >
          <View style={[st.radio, value === opt.id && st.radioDone]}>
            {value === opt.id && <View style={st.radioDot} />}
          </View>
          <Text style={st.radioTxt}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CheckboxGroup({ label, options, value, onChange }) {
  const toggle = (id) => {
    const updated = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value, id];
    onChange(updated);
  };

  return (
    <View style={st.group}>
      <Text style={st.label}>{label}</Text>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.id}
          style={st.checkRow}
          onPress={() => toggle(opt.id)}
        >
          <View style={[st.check, value.includes(opt.id) && st.checkDone]}>
            {value.includes(opt.id) && <Text style={st.checkMark}>✓</Text>}
          </View>
          <Text style={st.checkTxt}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function PerfilAdoptanteScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dogSize, setDogSize] = useState('any');
  const [experienceLevel, setExperienceLevel] = useState('some');
  const [spaceType, setSpaceType] = useState('apartment');
  const [timeAvailability, setTimeAvailability] = useState('some');
  const [livesWith, setLivesWith] = useState([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profile = await getAdoptantProfile(user.id);
      if (profile) {
        setDogSize(profile.dog_size || 'any');
        setExperienceLevel(profile.experience_level || 'some');
        setSpaceType(profile.space_type || 'apartment');
        setTimeAvailability(profile.time_availability || 'some');
        setLivesWith(profile.lives_with || []);
      }
    } catch (err) {
      console.warn('loadProfile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No hay usuario logueado');
        return;
      }

      const profile = await getAdoptantProfile(user.id);
      const data = {
        dogSize,
        experienceLevel,
        spaceType,
        timeAvailability,
        livesWith,
      };

      if (profile) {
        await updateAdoptantProfile(user.id, data);
      } else {
        await createAdoptantProfile(user.id, data);
      }

      Alert.alert('Éxito', 'Perfil actualizado', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el perfil');
      console.warn('save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={st.back}>‹</Text>
        </TouchableOpacity>
        <Text style={st.title}>Mi perfil de adoptante</Text>
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.card}>
          <Text style={st.cardTitle}>¿Qué tamaño de perro te gustaría?</Text>
          <RadioGroup
            options={[
              { id: 'small', label: '🐕 Pequeño (< 10 kg)' },
              { id: 'medium', label: '🐕 Mediano (10-25 kg)' },
              { id: 'large', label: '🐕 Grande (> 25 kg)' },
              { id: 'any', label: '🐕 Cualquier tamaño' },
            ]}
            value={dogSize}
            onChange={setDogSize}
          />
        </View>

        <View style={st.card}>
          <Text style={st.cardTitle}>¿Experiencia previa con perros?</Text>
          <RadioGroup
            options={[
              { id: 'none', label: 'Ninguna' },
              { id: 'some', label: 'Algo de experiencia' },
              { id: 'lots', label: 'Mucha experiencia' },
            ]}
            value={experienceLevel}
            onChange={setExperienceLevel}
          />
        </View>

        <View style={st.card}>
          <Text style={st.cardTitle}>¿Dónde vivirá el perro?</Text>
          <RadioGroup
            options={[
              { id: 'apartment', label: '🏢 Departamento' },
              { id: 'house', label: '🏠 Casa con patio' },
              { id: 'farm', label: '🌾 Chacra/Campo' },
            ]}
            value={spaceType}
            onChange={setSpaceType}
          />
        </View>

        <View style={st.card}>
          <Text style={st.cardTitle}>¿Cuánto tiempo pasarías con el perro?</Text>
          <RadioGroup
            options={[
              { id: 'little', label: 'Poco (< 2 horas/día)' },
              { id: 'some', label: 'Medio (2-6 horas/día)' },
              { id: 'lots', label: 'Mucho (> 6 horas/día)' },
            ]}
            value={timeAvailability}
            onChange={setTimeAvailability}
          />
        </View>

        <View style={st.card}>
          <Text style={st.cardTitle}>¿Con quién vivirá el perro?</Text>
          <CheckboxGroup
            options={[
              { id: 'kids', label: '👶 Niños' },
              { id: 'dogs', label: '🐕 Otros perros' },
              { id: 'cats', label: '🐱 Gatos' },
              { id: 'other', label: '🦎 Otras mascotas' },
            ]}
            value={livesWith}
            onChange={setLivesWith}
          />
        </View>

        <TouchableOpacity
          style={[st.saveBtn, saving && st.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={st.saveBtnTxt}>Guardar perfil</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cloud },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: S[16], backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  back: { fontSize: 32, color: C.teal, lineHeight: 36 },
  title: { fontSize: T.xl, fontWeight: '800', color: C.ink, flex: 1 },

  content: { padding: S[16], gap: 16, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: R.xl, padding: S[16], gap: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: T.base, fontWeight: '700', color: C.ink },

  group: { gap: 12 },
  label: { fontSize: T.sm, fontWeight: '600', color: C.inkMid },

  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border },
  radioDone: { borderColor: C.teal, backgroundColor: C.tealLight },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.teal, marginLeft: 4, marginTop: 4 },
  radioTxt: { fontSize: T.sm, color: C.ink },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  check: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: C.border },
  checkDone: { borderColor: C.teal, backgroundColor: C.teal },
  checkMark: { color: C.white, fontSize: T.xs, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  checkTxt: { fontSize: T.sm, color: C.ink },

  saveBtn: { backgroundColor: C.teal, borderRadius: R.xl, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnTxt: { fontSize: T.base, fontWeight: '700', color: C.white },
});
