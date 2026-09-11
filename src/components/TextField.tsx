import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Props = TextInputProps & {
  label: string;
  /** Texto pequeño bajo el campo (unidades, ayuda). */
  ayuda?: string;
};

export function TextField({ label, ayuda, style, onFocus, onBlur, ...props }: Props) {
  const { colors } = useTheme();
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        style={[
          typography.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.fill,
            // El foco se marca con un borde del color de marca en vez de
            // con un cambio de fondo: no desplaza nada y se ve claro.
            borderColor: enfocado ? colors.primary : 'transparent',
          },
          style,
        ]}
        accessibilityLabel={label}
        {...props}
      />
      {!!ayuda && <Text style={[typography.caption, { color: colors.textTertiary }]}>{ayuda}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: ALTO_CONTROL,
  },
});
