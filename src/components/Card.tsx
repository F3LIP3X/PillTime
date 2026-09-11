import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { sombraSegunTema } from '@/theme/shadows';

type Props = ViewProps & {
  /** 'raised' para el elemento protagonista de la pantalla. */
  elevacion?: 'card' | 'raised' | 'none';
  /** Sin padding interior, para listas cuyas filas ya llevan el suyo. */
  sinPadding?: boolean;
};

/**
 * Dos capas a propósito: la exterior proyecta la sombra y la interior
 * recorta el contenido al radio. En iOS, `overflow: 'hidden'` y
 * `shadow*` en la misma vista se anulan (el recorte se come la sombra),
 * así que separarlas es la única forma de tener esquinas limpias Y
 * elevación a la vez.
 */
export function Card({ style, elevacion = 'card', sinPadding = false, children, ...props }: Props) {
  const { colors, esOscuro } = useTheme();

  return (
    <View
      style={[styles.sombra, elevacion === 'none' ? null : sombraSegunTema(esOscuro, elevacion), style]}
      {...props}
    >
      <View style={[styles.recorte, sinPadding ? null : styles.conPadding, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sombra: {
    borderRadius: radii.lg,
  },
  recorte: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  conPadding: {
    padding: spacing.md,
    gap: spacing.xs,
  },
});
