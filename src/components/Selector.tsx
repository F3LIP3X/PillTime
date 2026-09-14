import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { HojaModal } from './HojaModal';
import { useTheme } from '@/theme/useTheme';
import { ALTO_CONTROL, spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Opcion<T extends string> = { valor: T; etiqueta: string; descripcion?: string };

type Props<T extends string> = {
  label?: string;
  opciones: Opcion<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Título de la hoja; por defecto, `label`. */
  titulo?: string;
};

/**
 * Desplegable: un campo con el valor elegido que abre una hoja con la
 * lista. Para cuando las opciones no caben en un SegmentedControl: los
 * beta testers rechazaron el control segmentado con scroll horizontal
 * (las opciones de la derecha no se veían y había que adivinar que existían).
 */
export function Selector<T extends string>({ label, opciones, valor, onChange, titulo }: Props<T>) {
  const { colors } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor);

  return (
    <View style={styles.container}>
      {!!label && <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>}
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? titulo ?? 'Seleccionar'}: ${actual?.etiqueta ?? ''}`}
        style={({ pressed }) => [styles.campo, { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[typography.body, styles.valor, { color: colors.text }]} numberOfLines={1}>
          {actual?.etiqueta}
        </Text>
        <ChevronDown color={colors.textSecondary} size={18} />
      </Pressable>

      <HojaModal visible={abierto} titulo={titulo ?? label ?? 'Seleccionar'} onClose={() => setAbierto(false)}>
        <View style={[styles.lista, { backgroundColor: colors.fill }]}>
          {opciones.map((opcion, index) => {
            const activa = opcion.valor === valor;
            return (
              <Pressable
                key={opcion.valor}
                onPress={() => {
                  onChange(opcion.valor);
                  setAbierto(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: activa }}
                style={({ pressed }) => [
                  styles.fila,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  pressed && { backgroundColor: colors.separator },
                ]}
              >
                <View style={styles.textos}>
                  <Text style={[typography.body, { color: activa ? colors.primary : colors.text, fontWeight: activa ? '600' : '400' }]}>
                    {opcion.etiqueta}
                  </Text>
                  {!!opcion.descripcion && (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{opcion.descripcion}</Text>
                  )}
                </View>
                {activa && <Check color={colors.primary} size={20} />}
              </Pressable>
            );
          })}
        </View>
      </HojaModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ALTO_CONTROL,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  valor: { flex: 1 },
  lista: { borderRadius: radii.md, overflow: 'hidden' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ALTO_CONTROL,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  textos: { flex: 1, gap: 2 },
});
