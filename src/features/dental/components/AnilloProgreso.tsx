import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';

type Props = { progreso: number; tamano: number; grosor?: number; color: string };

/** Anillo de progreso (0 a 1) que arranca arriba y avanza en el sentido del reloj. */
export function AnilloProgreso({ progreso, tamano, grosor = 12, color }: Props) {
  const { colors } = useTheme();
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const p = Math.min(1, Math.max(0, progreso));

  return (
    <Svg width={tamano} height={tamano} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={tamano / 2} cy={tamano / 2} r={radio} stroke={colors.fill} strokeWidth={grosor} fill="none" />
      {p > 0 && (
        <Circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          stroke={color}
          strokeWidth={grosor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={circunferencia * (1 - p)}
        />
      )}
    </Svg>
  );
}
