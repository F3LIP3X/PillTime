import { StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';

import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function NotFound() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Esta pantalla no existe.</Text>
        <Link href="/" style={{ color: colors.primary }}>
          Volver a Inicio
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
