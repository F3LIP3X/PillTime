import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';
import { escalaLineal } from '../escalas';

type Props = { valores: number[]; color: string; ancho?: number; alto?: number };

/** Minigráfica de tendencia (sin ejes) para la vista global: cada una con su propia escala. */
export function MiniGrafica({ valores, color, ancho = 72, alto = 28 }: Props) {
  const { colors } = useTheme();
  if (valores.length < 2) return null;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const x = escalaLineal([0, valores.length - 1], [4, ancho - 5]);
  const y = escalaLineal(min === max ? [min - 1, max + 1] : [min, max], [alto - 5, 5]);
  const d = valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <Svg width={ancho} height={alto} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(valores.length - 1)} cy={y(valores[valores.length - 1])} r={4} fill={color} stroke={colors.surface} strokeWidth={2} />
    </Svg>
  );
}
