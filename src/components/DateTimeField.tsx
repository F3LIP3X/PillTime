import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  mode: 'date' | 'time';
} & (
  | { value: Date; onChange: (fecha: Date) => void; opcional?: false }
  | {
      /** Campo opcional: null = sin fecha, se muestra `placeholder` y un botón para vaciarlo. */
      value: Date | null;
      onChange: (fecha: Date | null) => void;
      opcional: true;
      placeholder?: string;
    }
);

export function DateTimeField(props: Props) {
  const { label, mode, value } = props;
  const { colors } = useTheme();
  const [mostrar, setMostrar] = useState(false);

  const texto = value
    ? mode === 'time'
      ? value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : props.opcional
      ? (props.placeholder ?? 'Sin fecha')
      : '';

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.caja, { backgroundColor: colors.campo, borderColor: colors.bordeCampo }]}>
        <Pressable
          onPress={() => setMostrar(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${texto}`}
          style={styles.boton}
        >
          <Text style={[typography.body, { color: value ? colors.text : colors.textTertiary }]}>{texto}</Text>
        </Pressable>
        {props.opcional && value && (
          <Pressable
            onPress={() => props.onChange(null)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${label.toLowerCase()}`}
            hitSlop={8}
            style={styles.limpiar}
          >
            <X color={colors.textTertiary} size={18} />
          </Pressable>
        )}
      </View>
      {mostrar && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          display="default"
          onValueChange={(_evento, seleccion) => {
            setMostrar(false);
            props.onChange(seleccion);
          }}
          onDismiss={() => setMostrar(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  caja: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, borderWidth: 1.5, minHeight: ALTO_CONTROL },
  boton: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: spacing.md },
  limpiar: { paddingHorizontal: spacing.md, alignSelf: 'stretch', justifyContent: 'center' },
});
