import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';

type Props = {
  visible: boolean;
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Hoja que sube desde abajo, con asa y fondo atenuado. Pulsar fuera
 * cierra. Se prefiere a un modal centrado porque el pulgar llega a los
 * controles sin recolocar la mano — la app se usa con una mano y con
 * prisa (es un recordatorio de medicación, no un formulario de oficina).
 */
export function HojaModal({ visible, titulo, onClose, children }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.hoja, { backgroundColor: colors.surface }]}>
        <View style={[styles.asa, { backgroundColor: colors.separator }]} />
        <Text style={[typography.subtitle, styles.titulo, { color: colors.text }]}>{titulo}</Text>
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0A1416AA' },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
  },
  asa: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  titulo: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  contenido: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
});
