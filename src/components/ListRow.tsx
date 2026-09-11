import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Pressable3D } from './Pressable3D';
import { useTheme } from '@/theme/useTheme';
import { MIN_TOUCH_TARGET, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Props = {
  titulo: string;
  subtitulo?: string;
  izquierda?: React.ReactNode;
  /** Contenido a la derecha, antes del chevron (un badge, una cifra...). */
  derecha?: React.ReactNode;
  onPress?: () => void;
  /** Oculta el chevron aunque la fila sea pulsable. */
  sinChevron?: boolean;
  /** Línea inferior; se omite en la última fila del grupo. */
  conSeparador?: boolean;
};

/**
 * Fila de lista agrupada: el separador arranca alineado con el texto (no
 * con el borde de la tarjeta) cuando hay icono, que es lo que hace que
 * una lista se lea como una unidad y no como filas sueltas.
 */
export function ListRow({
  titulo,
  subtitulo,
  izquierda,
  derecha,
  onPress,
  sinChevron = false,
  conSeparador = true,
}: Props) {
  const { colors } = useTheme();

  const contenido = (
    <View style={styles.fila}>
      {izquierda}
      <View style={styles.textos}>
        <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
          {titulo}
        </Text>
        {!!subtitulo && (
          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        )}
      </View>
      {derecha}
      {onPress && !sinChevron && <ChevronRight color={colors.textTertiary} size={18} />}
    </View>
  );

  const cuerpo = (
    <View>
      {contenido}
      {conSeparador && (
        <View
          style={[
            styles.separador,
            { backgroundColor: colors.separator, marginLeft: izquierda ? 44 + spacing.md * 2 : spacing.md },
          ]}
        />
      )}
    </View>
  );

  if (!onPress) return cuerpo;

  return (
    <Pressable3D onPress={onPress} escala={0.985} accessibilityRole="button" accessibilityLabel={titulo}>
      {cuerpo}
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET + 12,
  },
  textos: { flex: 1, gap: 2 },
  separador: { height: StyleSheet.hairlineWidth },
});
