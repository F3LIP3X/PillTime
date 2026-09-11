import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';

type Props = {
  children: React.ReactNode;
  /**
   * `true` en pantallas con barra de pestañas: ahí la zona segura
   * inferior ya la ocupa la propia barra, así que sumarla otra vez
   * dejaría un hueco muerto. `useSafeAreaInsets` devuelve el inset del
   * dispositivo sin saber nada de la barra de pestañas, de ahí que haya
   * que distinguirlo a mano.
   */
  dentroDeTabs?: boolean;
};

/** Barra inferior fija para la acción principal de una pantalla. */
export function PieAccion({ children, dentroDeTabs = false }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.pie,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.separator,
          paddingBottom: dentroDeTabs ? spacing.md : spacing.md + insets.bottom,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pie: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
