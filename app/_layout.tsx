import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { DATABASE_NAME } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

// Conexión aparte solo para aplicar migraciones antes de montar el árbol;
// SQLiteProvider abre su propia conexión al mismo archivo para los hooks
// de las pantallas (useDb -> useSQLiteContext). Es el patrón oficial de
// Drizzle + expo-sqlite (https://orm.drizzle.team/docs/get-started/expo-new).
const expoDb = openDatabaseSync(DATABASE_NAME);
const migratorDb = drizzle(expoDb);

export default function RootLayout() {
  const { success, error } = useMigrations(migratorDb, migrations);
  const { colors, esOscuro } = useTheme();

  useEffect(() => {
    if (error) console.error('Error aplicando migraciones de SQLite:', error);
  }, [error]);

  if (error) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background }]}>
        <Text style={[typography.body, { color: colors.error }]}>
          No se pudo preparar la base de datos: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName={DATABASE_NAME}>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="medicamento/nuevo" options={{ title: 'Nuevo medicamento' }} />
        <Stack.Screen name="medicamento/[id]/detalle" options={{ title: 'Medicamento' }} />
        <Stack.Screen name="medicamento/[id]/editar" options={{ title: 'Editar medicamento' }} />
        <Stack.Screen name="cita/index" options={{ title: 'Citas médicas' }} />
        <Stack.Screen name="cita/nueva" options={{ title: 'Nueva cita' }} />
      </Stack>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
