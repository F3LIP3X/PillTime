import { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type ViewStyle } from 'react-native';

type Props = PressableProps & {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Cuánto se encoge al pulsar. 0.97 para tarjetas grandes, 0.95 para botones. */
  escala?: number;
};

/**
 * Pulsación con un pequeño hundido elástico. Es el detalle que hace que
 * la interfaz se sienta "viva" al tocarla en vez de estática: sin esto,
 * un botón solo cambia de opacidad y parece una imagen.
 *
 * Se usa `Animated` del propio React Native (no reanimated) porque el
 * proyecto no lo necesita para nada más y `useNativeDriver` ya deja la
 * animación en el hilo nativo.
 */
export function Pressable3D({ children, style, escala = 0.97, ...props }: Props) {
  const escalaAnim = useRef(new Animated.Value(1)).current;

  const animar = (destino: number) =>
    Animated.spring(escalaAnim, {
      toValue: destino,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Pressable
      onPressIn={() => animar(escala)}
      onPressOut={() => animar(1)}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale: escalaAnim }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
