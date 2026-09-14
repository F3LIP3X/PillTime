import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';
import { escalaLineal, ticksLimpios } from '../escalas';

type Props = {
  barras: { etiqueta: string; valor: number }[];
  color: string;
  alto?: number;
  descripcion: string;
};

const MARGEN = { arriba: 16, abajo: 22, izquierda: 8, derecha: 8 };

/** Columnas de recuento (síntomas por día o semana): ≤ 24 px, esquinas de 4 px solo arriba, base plana. */
export function GraficaBarras({ barras, color, alto = 140, descripcion }: Props) {
  const { colors } = useTheme();
  const [ancho, setAncho] = useState(0);

  const max = Math.max(1, ...barras.map((b) => b.valor));
  const ticks = ticksLimpios(0, max, 2);
  const techo = ticks[ticks.length - 1];
  const y = escalaLineal([0, techo], [alto - MARGEN.abajo, MARGEN.arriba]);
  const hueco = (ancho - MARGEN.izquierda - MARGEN.derecha) / Math.max(1, barras.length);
  const grosor = Math.min(24, hueco * 0.6);
  // Con muchas columnas, se etiqueta una de cada N para que no se pisen.
  const cadaN = Math.ceil(barras.length / 6);

  return (
    <View style={{ height: alto }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessible accessibilityLabel={descripcion}>
      {ancho > 0 && (
        <Svg width={ancho} height={alto}>
          <Line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(0)} y2={y(0)} stroke={colors.eje} strokeWidth={1} />
          {barras.map((b, i) => {
            const cx = MARGEN.izquierda + hueco * i + hueco / 2;
            const x0 = cx - grosor / 2;
            const top = y(b.valor);
            const r = Math.min(4, (y(0) - top) / 2, grosor / 2);
            const d =
              b.valor > 0
                ? `M${x0},${y(0)} L${x0},${top + r} Q${x0},${top} ${x0 + r},${top} L${x0 + grosor - r},${top} Q${x0 + grosor},${top} ${x0 + grosor},${top + r} L${x0 + grosor},${y(0)} Z`
                : '';
            return (
              <G key={i}>
                {d ? <Path d={d} fill={color} /> : null}
                {b.valor > 0 && (
                  <SvgText x={cx} y={top - 4} fontSize={11} fill={colors.textSecondary} textAnchor="middle">
                    {b.valor}
                  </SvgText>
                )}
                {i % cadaN === 0 && (
                  <SvgText x={cx} y={alto - 6} fontSize={11} fill={colors.textTertiary} textAnchor="middle">
                    {b.etiqueta}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
