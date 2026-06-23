import React, { useState, useRef } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType    = 'default',
  multiline       = false,
  numberOfLines   = 1,
  error,
  hint,
  icon,
  rightAction,
  style,
  inputStyle,
  autoCapitalize  = 'sentences',
  editable        = true,
}) {
  const [focused,  setFocused]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? COLORS.error : COLORS.border, error ? COLORS.error : COLORS.gold],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View style={[styles.container, { borderColor }, focused && SHADOW.sm]}>
        {icon && <Text style={styles.iconLeft}>{icon}</Text>}

        <TextInput
          style={[
            styles.input,
            multiline && { height: numberOfLines * 24 + 16, textAlignVertical: 'top' },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={secureTextEntry && !showPass}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />

        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
        {rightAction && !secureTextEntry && rightAction}
      </Animated.View>

      {(error || hint) && (
        <Text style={[styles.hint, error && styles.hintError]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md },
  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textBody,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    minHeight: 50,
  },
  iconLeft: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.black,
    paddingVertical: SPACING.sm,
    fontFamily: 'sans-serif',
  },
  eyeBtn: { padding: SPACING.xs },
  eyeIcon: { fontSize: 16 },
  hint: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
  hintError: { color: COLORS.error },
});
