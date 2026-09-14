import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PieAccion } from '@/components/PieAccion';
import { CamposMedicamento } from '@/features/medicamentos/components/CamposMedicamento';
import { EditorPauta } from '@/features/medicamentos/components/EditorPauta';
import { aDatosMedicamento, formularioVacio, validarFormulario } from '@/features/medicamentos/formulario';
import { useCrearMedicamento } from '@/features/medicamentos/hooks/useCrearMedicamento';
import { useCrearPauta } from '@/features/medicamentos/hooks/usePautas';
import { pautaNueva, validarPauta } from '@/features/medicamentos/pauta';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { mensajeErrorGuardado } from '@/features/medicamentos/errores';

export default function NuevoMedicamento() {
  const { colors } = useTheme();
  const router = useRouter();
  const crearMedicamento = useCrearMedicamento();
  const crearPauta = useCrearPauta();

  const [formulario, setFormulario] = useState(formularioVacio);
  const [pauta, setPauta] = useState(pautaNueva);
  const [guardando, setGuardando] = useState(false);

  const error = validarFormulario(formulario) ?? validarPauta(pauta);

  const handleGuardar = async () => {
    if (error) return;
    setGuardando(true);
    try {
      const medicamento = await crearMedicamento(aDatosMedicamento(formulario));
      await crearPauta(medicamento.id, pauta);
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeErrorGuardado(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <CamposMedicamento valor={formulario} onChange={setFormulario} />

        <View style={styles.grupo}>
          <Text style={[typography.overline, styles.tituloGrupo, { color: colors.textTertiary }]}>Pauta</Text>
          <Card>
            <EditorPauta valor={pauta} onChange={setPauta} />
          </Card>
        </View>
      </ScrollView>

      <PieAccion>
        <Button
          label={guardando ? 'Guardando…' : 'Guardar medicamento'}
          onPress={handleGuardar}
          disabled={!!error || guardando}
        />
      </PieAccion>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  grupo: { gap: spacing.sm },
  tituloGrupo: { marginLeft: spacing.xs },
});
