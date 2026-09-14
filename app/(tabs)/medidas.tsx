import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Activity, Pencil, Plus } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Pressable3D } from '@/components/Pressable3D';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Selector } from '@/components/Selector';
import { TIPO_MEDIDA_SALUD, type TipoMedidaSalud } from '@/db/schema';
import { CamposMedida, type ValoresFormularioMedida } from '@/features/medidas-salud/components/CamposMedida';
import { aDatosMedida } from '@/features/medidas-salud/components/datosMedida';
import { EditarMedidaModal } from '@/features/medidas-salud/components/EditarMedidaModal';
import { PanelGraficas } from '@/features/medidas-salud/components/PanelGraficas';
import { useMedidasSalud } from '@/features/medidas-salud/hooks/useMedidasSalud';
import { INFO_MEDIDA, textoMedida, validarValores, type Medida } from '@/features/medidas-salud/tipos';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const VACIO: ValoresFormularioMedida = { textos: [], notas: '' };

export default function Medidas() {
  const { colors } = useTheme();
  const [seccion, setSeccion] = useState<'registros' | 'graficas'>('registros');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.selectorSeccion}>
        <SegmentedControl
          opciones={[
            { valor: 'registros', etiqueta: 'Registros' },
            { valor: 'graficas', etiqueta: 'Gráficas' },
          ]}
          valor={seccion}
          onChange={setSeccion}
        />
      </View>
      {seccion === 'registros' ? <Registros /> : <PanelGraficas />}
    </View>
  );
}

function Registros() {
  const { colors } = useTheme();
  const [tipo, setTipo] = useState<TipoMedidaSalud>('tension');
  const [valores, setValores] = useState<ValoresFormularioMedida>(VACIO);
  const [intentado, setIntentado] = useState(false);
  const { medidas, registrar, actualizar, eliminar, recargar } = useMedidasSalud(tipo);
  const [medidaEditando, setMedidaEditando] = useState<Medida | null>(null);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  const info = INFO_MEDIDA[tipo];
  const error = validarValores(tipo, valores.textos, valores.notas);
  const vacio = valores.textos.every((t) => !t?.trim()) && !valores.notas.trim();

  const handleRegistrar = async () => {
    setIntentado(true);
    if (error) return;
    await registrar(aDatosMedida(tipo, valores, new Date()));
    setValores(VACIO);
    setIntentado(false);
  };

  return (
    <>
      <FlatList
        data={medidas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.cabecera}>
            <Selector
              label="Tipo de medida"
              opciones={TIPO_MEDIDA_SALUD.map((t) => ({ valor: t, etiqueta: INFO_MEDIDA[t].etiqueta }))}
              valor={tipo}
              onChange={(t) => {
                setTipo(t);
                setValores(VACIO);
                setIntentado(false);
              }}
            />

            <Card>
              <View style={styles.formulario}>
                <Text style={[typography.overline, { color: colors.textTertiary }]}>Nuevo registro</Text>
                <CamposMedida tipo={tipo} valor={valores} onChange={setValores} />
                {intentado && !!error && <Text style={[typography.caption, { color: colors.error }]}>{error}</Text>}
                <Button
                  label="Registrar"
                  icono={<Plus color="#FFFFFF" size={18} />}
                  disabled={vacio}
                  onPress={handleRegistrar}
                />
              </View>
            </Card>

            {medidas.length > 0 && (
              <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>
                Historial · {info.etiqueta}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icono={<Activity color={colors.primary} size={30} />}
            titulo={`Sin registros de ${info.etiqueta.toLowerCase()}`}
            descripcion="Anota un valor arriba y se irá guardando aquí con su fecha."
          />
        }
        renderItem={({ item }) => {
          const texto = textoMedida(item);
          const esTexto = item.tipo === 'sintoma';
          return (
            <Card sinPadding style={styles.tarjetaMedida}>
              <Pressable3D onPress={() => setMedidaEditando(item)} escala={0.985}>
                <View style={[styles.filaMedida, esTexto && styles.filaTexto]}>
                  <View style={styles.valorBloque}>
                    {esTexto ? (
                      <Text style={[typography.body, { color: colors.text }]} numberOfLines={3}>
                        {texto.valor}
                      </Text>
                    ) : (
                      <View style={styles.valorLinea}>
                        <Text style={[typography.title, { color: colors.text }]}>{texto.valor}</Text>
                        {!!texto.unidad && (
                          <Text style={[typography.caption, { color: colors.textTertiary }]}>{texto.unidad}</Text>
                        )}
                      </View>
                    )}
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {new Date(item.fechaHora).toLocaleString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {texto.extra ? ` · ${texto.extra}` : ''}
                    </Text>
                  </View>
                  <Pencil color={colors.textTertiary} size={16} />
                </View>
              </Pressable3D>
            </Card>
          );
        }}
      />

      <EditarMedidaModal
        medida={medidaEditando}
        onClose={() => setMedidaEditando(null)}
        onGuardar={actualizar}
        onEliminar={eliminar}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectorSeccion: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  cabecera: { gap: spacing.md, paddingTop: spacing.md },
  formulario: { gap: spacing.md },
  lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  tituloGrupo: { marginTop: spacing.sm, marginLeft: spacing.xs },
  tarjetaMedida: { marginBottom: spacing.sm },
  filaMedida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filaTexto: { alignItems: 'flex-start' },
  valorBloque: { flex: 1, gap: 2 },
  valorLinea: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
});
