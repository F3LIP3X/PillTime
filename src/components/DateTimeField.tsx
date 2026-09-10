import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/theme/useTheme';
import { spacing, MIN_TOUCH_TARGET } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (fecha: Date) => void;
};

export function DateTimeField({ label, value, mode, onChange }: Props) {
  const { colors, esOscuro } = useTheme();
  const [mostrar, setMostrar] = useState(false);

  const texto =
    mode === 'time'
      ? value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString('es-ES');

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setMostrar(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${texto}`}
        style={[
          styles.boton,
          { borderColor: colors.textSecondary + '55', backgroundColor: esOscuro ? '#1B2626' : '#FFFFFF' },
        ]}
      >
        <Text style={[typography.body, { color: colors.text }]}>{texto}</Text>
      </Pressable>
      {mostrar && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onValueChange={(_evento, seleccion) => {
            setMostrar(false);
            onChange(seleccion);
          }}
          onDismiss={() => setMostrar(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  boton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
