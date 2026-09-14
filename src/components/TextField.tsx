import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Props = TextInputProps & {
  label: string;
  /** Texto pequeño bajo el campo (una pista, un error). No para unidades: eso es `sufijo`. */
  ayuda?: string;
  /** Unidad dentro del campo, a la derecha del valor ("kg", "horas"). */
  sufijo?: string;
  /** Pinta la ayuda y el borde en color de error. */
  error?: boolean;
};

/**
 * La unidad va DENTRO de la caja, pegada al número, y no debajo: bug de
 * diseño reportado por beta testers ("kg" quedaba suelto bajo el campo de
 * peso y parecía otra etiqueta). Por eso el borde y el fondo los lleva la
 * vista contenedora y el TextInput va sin borde dentro.
 */
export function TextField({ label, ayuda, sufijo, error = false, style, onFocus, onBlur, ...props }: Props) {
  const { colors } = useTheme();
  const [enfocado, setEnfocado] = useState(false);

  // Borde siempre visible: sin él el campo se confunde con la tarjeta y
  // parece deshabilitado. Mismo grosor en todos los estados para que
  // enfocar no desplace nada; solo cambia el color.
  const colorBorde = error ? colors.error : enfocado ? colors.primary : colors.bordeCampo;

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.caja, { backgroundColor: colors.campo, borderColor: colorBorde }]}>
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
          style={[typography.body, styles.input, { color: colors.text }, style]}
          accessibilityLabel={sufijo ? `${label} (${sufijo})` : label}
          {...props}
        />
        {!!sufijo && (
          <Text style={[typography.body, styles.sufijo, { color: colors.textTertiary }]} numberOfLines={1}>
            {sufijo}
          </Text>
        )}
      </View>
      {!!ayuda && (
        <Text style={[typography.caption, { color: error ? colors.error : colors.textTertiary }]}>{ayuda}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.md,
    minHeight: ALTO_CONTROL,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sufijo: { paddingRight: spacing.md },
});
