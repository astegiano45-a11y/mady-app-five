// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · FormInput — Semana 1
//  Input reutilizable para formularios de auth con:
//    • Animación de label flotante (float label)
//    • Highlight de borde dorado al enfocarse
//    • Estado de error con mensaje
//    • Toggle de visibilidad para contraseñas
//    • Variantes: text | email | password | phone
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';

export default function FormInput({
  label,
  value,
  onChangeText,
  type          = 'text',   // 'text' | 'email' | 'password' | 'phone'
  placeholder,
  error,
  hint,
  icon,                     // emoji o string
  disabled      = false,
  autoFocus     = false,
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
  style,
}) {
  const [focused,   setFocused]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [hasValue,  setHasValue]  = useState(!!value);

  // Animaciones
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim  = useRef(new Animated.Value(value ? 1 : 0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  // Sincronizar hasValue cuando value cambia externamente
  useEffect(() => {
    setHasValue(!!value);
    Animated.timing(labelAnim, {
      toValue: (focused || !!value) ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value]);

  // Shake en error
  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error]);

  const handleFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim,  { toValue: 1, duration: 160, useNativeDriver: false }),
    ]).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim,  {
        toValue: value ? 1 : 0,
        duration: 160,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Interpolaciones
  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      error ? COLORS.error : COLORS.border,
      error ? COLORS.error : COLORS.gold,
    ],
  });
  const borderWidth = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [1.5, 2],
  });
  const labelTop = labelAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [15, -10],
  });
  const labelFontSize = labelAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [FONTS.base, FONTS.xs],
  });
  const labelColor = labelAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      COLORS.placeholder,
      error ? COLORS.error : focused ? COLORS.gold : COLORS.textMuted,
    ],
  });

  // Props del TextInput según tipo
  const inputProps = {
    text:     { keyboardType: 'default',       autoCapitalize: 'words',    autoComplete: 'name' },
    email:    { keyboardType: 'email-address', autoCapitalize: 'none',     autoComplete: 'email' },
    password: { keyboardType: 'default',       autoCapitalize: 'none',     autoComplete: 'password', secureTextEntry: !showPass },
    phone:    { keyboardType: 'phone-pad',     autoCapitalize: 'none',     autoComplete: 'tel' },
  }[type] ?? {};

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateX: shakeAnim }] },
        style,
      ]}
    >
      {/* ── Contenedor del input ── */}
      <Animated.View
        style={[
          styles.container,
          { borderColor, borderWidth },
          disabled && styles.containerDisabled,
        ]}
      >
        {/* Label flotante */}
        <Animated.Text
          style={[
            styles.floatLabel,
            { top: labelTop, fontSize: labelFontSize, color: labelColor },
            icon && { left: 48 },   // desplazar si hay ícono
          ]}
        >
          {label}
        </Animated.Text>

        {/* Ícono izquierdo */}
        {icon && (
          <View style={styles.iconLeft}>
            <Text style={[styles.iconText, focused && styles.iconTextFocused]}>
              {icon}
            </Text>
          </View>
        )}

        {/* Input real */}
        <TextInput
          ref={inputRef}
          style={[styles.input, icon && styles.inputWithIcon]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={focused ? placeholder : ''}
          placeholderTextColor={COLORS.placeholder}
          editable={!disabled}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectionColor={COLORS.gold}
          {...inputProps}
        />

        {/* Toggle contraseña */}
        {type === 'password' && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPass((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}

        {/* Check de campo válido */}
        {value && !error && !focused && type !== 'password' && (
          <View style={styles.checkMark}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      </Animated.View>

      {/* ── Mensaje error / hint ── */}
      {(error || hint) && (
        <View style={styles.messageRow}>
          <Text style={styles.messageIcon}>{error ? '⚠️' : 'ℹ️'}</Text>
          <Text style={[styles.message, error ? styles.messageError : styles.messageHint]}>
            {error || hint}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md + 4,
  },

  // ── Container ──────────────────────────────────────────────────────────────
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#FFFFFF',
    borderRadius:    RADIUS.md,
    paddingHorizontal: SPACING.md,
    minHeight:       58,
    position:        'relative',
  },
  containerDisabled: {
    backgroundColor: COLORS.creamDark,
    opacity: 0.6,
  },

  // ── Label flotante ─────────────────────────────────────────────────────────
  floatLabel: {
    position:        'absolute',
    left:            SPACING.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    fontWeight:      FONTS.medium,
    letterSpacing:   0.2,
    zIndex:          2,
  },

  // ── Íconos ─────────────────────────────────────────────────────────────────
  iconLeft: {
    marginRight:    SPACING.sm,
    width:          26,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconText:        { fontSize: 18, opacity: 0.55 },
  iconTextFocused: { opacity: 1 },

  // ── TextInput ──────────────────────────────────────────────────────────────
  input: {
    flex:          1,
    fontSize:      FONTS.base,
    color:         COLORS.black,
    paddingTop:    18,         // espacio para label flotante
    paddingBottom:  8,
    fontFamily:    Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputWithIcon: {
    // el padding-left lo pone el iconLeft, no hace falta extra
  },

  // ── Acciones derecha ───────────────────────────────────────────────────────
  eyeBtn:   { padding: SPACING.sm },
  eyeIcon:  { fontSize: 16 },
  checkMark:{ marginLeft: SPACING.xs },
  checkIcon:{ fontSize: 14, color: COLORS.success, fontWeight: '700' },

  // ── Mensajes ───────────────────────────────────────────────────────────────
  messageRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           4,
    marginTop:     4,
    paddingLeft:   4,
  },
  messageIcon:  { fontSize: 11, marginTop: 1 },
  message:      { flex: 1, fontSize: FONTS.xs, lineHeight: 16 },
  messageError: { color: COLORS.error },
  messageHint:  { color: COLORS.textMuted },
});
