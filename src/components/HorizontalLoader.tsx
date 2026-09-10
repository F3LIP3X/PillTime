import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

const ANCHO_PISTA = 200;
const ANCHO_BARRA = 70;

export function HorizontalLoader() {
  const { colors } = useTheme();
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.timing(progreso, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    animacion.start();
    return () => animacion.stop();
  }, [progreso]);

  const translateX = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [-ANCHO_BARRA, ANCHO_PISTA],
  });

  return (
    <View
      style={[styles.pista, { width: ANCHO_PISTA, backgroundColor: colors.textSecondary + '22' }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
    >
      <Animated.View
        style={[styles.barra, { width: ANCHO_BARRA, backgroundColor: colors.primary, transform: [{ translateX }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pista: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barra: { position: 'absolute', height: 4, borderRadius: 2 },
});
