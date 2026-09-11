import { Platform, type ViewStyle } from 'react-native';

/**
 * Sombras suaves y muy bajas en opacidad: la elevación se nota, pero no
 * se "ve" la sombra. En modo oscuro no se usan sombras (sobre fondo casi
 * negro no se perciben y solo ensucian): ahí la jerarquía la da el color
 * de superficie, que es más claro que el fondo.
 */
function sombra(y: number, blur: number, opacidad: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B1F22',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacidad,
      shadowRadius: blur,
    },
    android: { elevation },
    default: {},
  })!;
}

export const shadows = {
  /** Tarjetas en reposo. */
  card: sombra(2, 8, 0.06, 2),
  /** Elemento destacado (la próxima toma). */
  raised: sombra(6, 18, 0.1, 6),
  none: {} as ViewStyle,
};

export function sombraSegunTema(esOscuro: boolean, nivel: keyof typeof shadows): ViewStyle {
  return esOscuro ? shadows.none : shadows[nivel];
}
