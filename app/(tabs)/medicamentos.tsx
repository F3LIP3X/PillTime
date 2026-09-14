import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CircleStop, Pill, Plus } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PieAccion } from '@/components/PieAccion';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconoCircular } from '@/components/IconoCircular';
import { ListRow } from '@/components/ListRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { useMedicamentos } from '@/features/medicamentos/hooks/useMedicamentos';
import { estadoCaducidad } from '@/features/medicamentos/formulario';

const UMBRAL_STOCK_BAJO = 5;

export default function Medicamentos() {
  const { colors } = useTheme();
  const router = useRouter();
  const [vista, setVista] = useState<'activos' | 'terminados'>('activos');
  const { medicamentos, recargar } = useMedicamentos({ soloActivos: vista === 'activos' });

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  const lista = vista === 'terminados' ? medicamentos.filter((m) => !m.activo) : medicamentos;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          opciones={[
            { valor: 'activos', etiqueta: 'Activos' },
            { valor: 'terminados', etiqueta: 'Terminados' },
          ]}
          valor={vista}
          onChange={setVista}
        />

        {lista.length === 0 ? (
          <EmptyState
            icono={
              vista === 'terminados' ? (
                <CircleStop color={colors.primary} size={30} />
              ) : (
                <Pill color={colors.primary} size={30} />
              )
            }
            titulo={vista === 'terminados' ? 'Ningún tratamiento terminado' : 'Sin medicamentos'}
            descripcion={
              vista === 'terminados'
                ? 'Cuando acabe la pauta de un medicamento, o lo termines a mano, pasará aquí con su historial. Desde aquí se puede reactivar.'
                : 'Añade el primero para empezar a recibir recordatorios de tus tomas.'
            }
          />
        ) : (
          <>
            <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>
              {lista.length} {lista.length === 1 ? 'medicamento' : 'medicamentos'}
            </Text>
            <Card sinPadding>
              {lista.map((medicamento, index) => {
                const stockBajo = medicamento.stockRestante <= UMBRAL_STOCK_BAJO;
                const caducidad = estadoCaducidad(medicamento.fechaCaducidad);
                return (
                  <ListRow
                    key={medicamento.id}
                    titulo={medicamento.nombre}
                    subtitulo={
                      caducidad === 'caducado'
                        ? `${medicamento.dosis} · Caducado`
                        : caducidad === 'pronto'
                          ? `${medicamento.dosis} · Caduca pronto`
                          : medicamento.dosis
                    }
                    izquierda={
                      <IconoCircular>
                        <Pill color={colors.primary} size={20} />
                      </IconoCircular>
                    }
                    derecha={
                      <View
                        style={[
                          styles.badgeStock,
                          { backgroundColor: stockBajo ? colors.errorSoft : colors.fill },
                        ]}
                      >
                        <Text
                          style={[
                            typography.caption,
                            { color: stockBajo ? colors.error : colors.textSecondary, fontWeight: '600' },
                          ]}
                        >
                          {medicamento.stockRestante}
                        </Text>
                      </View>
                    }
                    onPress={() => router.push(`/medicamento/${medicamento.id}/detalle`)}
                    conSeparador={index < lista.length - 1}
                  />
                );
              })}
            </Card>
            <Text style={[typography.caption, styles.pieGrupo, { color: colors.textTertiary }]}>
              La cifra de la derecha son las unidades que quedan según las tomas registradas.
            </Text>
          </>
        )}
      </ScrollView>

      <PieAccion dentroDeTabs>
        <Button
          label="Añadir medicamento"
          icono={<Plus color="#FFFFFF" size={18} />}
          onPress={() => router.push('/medicamento/nuevo')}
          accessibilityLabel="Añadir medicamento"
        />
      </PieAccion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contenido: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  tituloGrupo: { marginTop: spacing.xs, marginLeft: spacing.xs },
  pieGrupo: { marginLeft: spacing.xs, marginTop: -spacing.xs },
  badgeStock: {
    minWidth: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
});
