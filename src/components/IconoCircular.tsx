import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radii } from '@/theme/radii';

type Props = {
  children: React.ReactNode;
  /** Color de fondo; por defecto el tinte suave del primario. */
  fondo?: string;
  tamano?: number;
};

/** Icono dentro de un círculo tintado: da peso visual sin recurrir a más texto. */
export function IconoCircular({ children, fondo, tamano = 44 }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.circulo,
        { width: tamano, height: tamano, backgroundColor: fondo ?? colors.primarySoft },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
