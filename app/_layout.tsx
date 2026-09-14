import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Pill } from 'lucide-react-native';

import { DATABASE_NAME } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { HorizontalLoader } from '@/components/HorizontalLoader';
import { useInicializarNotificaciones } from '@/features/notificaciones/useInicializarNotificaciones';
import { usePreferenciasStore } from '@/stores/preferenciasStore';

// Conexión aparte solo para aplicar migraciones antes de montar el árbol;
// SQLiteProvider abre su propia conexión al mismo archivo para los hooks
// de las pantallas (useDb -> useSQLiteContext). Es el patrón oficial de
// Drizzle + expo-sqlite (https://orm.drizzle.team/docs/get-started/expo-new).
const expoDb = openDatabaseSync(DATABASE_NAME);
const migratorDb = drizzle(expoDb);

export default function RootLayout() {
  const { success, error } = useMigrations(migratorDb, migrations);
  const { colors, esOscuro } = useTheme();
  const opacidad = useRef(new Animated.Value(0)).current;
  const traslado = useRef(new Animated.Value(12)).current;

  const onboardingCompletado = usePreferenciasStore((s) => s.onboardingCompletado);

  // Canal de Android + permiso de notificaciones. Sin esto no suena nada
  // en Android 13+ aunque los recordatorios estén bien programados. El
  // permiso se pide al terminar el onboarding (el último paso lo anuncia),
  // no encima de la pantalla de bienvenida.
  useInicializarNotificaciones(onboardingCompletado);

  useEffect(() => {
    if (error) console.error('Error aplicando migraciones de SQLite:', error);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(traslado, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [success, opacidad, traslado]);

  if (error) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Text style={[typography.subtitle, styles.textoCentrado, { color: colors.text }]}>
          No se pudo preparar la base de datos
        </Text>
        <Text style={[typography.bodySmall, styles.textoCentrado, { color: colors.textSecondary }]}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background, gap: spacing.lg }]}>
        <View style={[styles.marcaCirculo, { backgroundColor: colors.primarySoft }]}>
          <Pill color={colors.primary} size={34} />
        </View>
        <HorizontalLoader />
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: opacidad, transform: [{ translateY: traslado }] }}>
      <SQLiteProvider databaseName={DATABASE_NAME}>
        <StatusBar style={esOscuro ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerShadowVisible: false,
            headerTitleStyle: { ...typography.subtitle, color: colors.text },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {/*
            Sin Stack.Protected a propósito. Con guards, al pulsar "Empezar a
            usar PillTime" el flag cambiaba pero en dispositivo no se salía
            del onboarding hasta reiniciar la app (mismo fallo que tuvo la
            pestaña Ciclo con Tabs.Protected). Ahora todas las rutas están
            siempre registradas y la navegación es explícita: el último paso
            hace router.replace('/'), y (tabs)/_layout y onboarding/_layout
            redirigen si alguien llega a la rama que no le toca.
          */}
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="medicamento/nuevo" options={{ title: 'Nuevo medicamento' }} />
          <Stack.Screen name="medicamento/[id]/detalle" options={{ title: 'Medicamento' }} />
          <Stack.Screen name="medicamento/[id]/editar" options={{ title: 'Editar medicamento' }} />
          <Stack.Screen name="historial" options={{ title: 'Historial' }} />
          <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
          <Stack.Screen name="cita/index" options={{ title: 'Citas médicas' }} />
          <Stack.Screen name="cita/nueva" options={{ title: 'Nueva cita' }} />
        </Stack>
      </SQLiteProvider>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textoCentrado: { textAlign: 'center' },
  marcaCirculo: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
