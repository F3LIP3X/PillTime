import { useState } from 'react';
import { Redirect, Stack } from 'expo-router';

import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { useTheme } from '@/theme/useTheme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  // Se lee UNA vez al montar, sin suscribirse al store. Si se suscribiera,
  // al pulsar "Empezar a usar PillTime" este layout cambiaría su Stack por
  // un <Redirect> en el mismo render en que listo.tsx lanza
  // router.replace('/'): se desmonta la pila del onboarding a mitad de la
  // transición nativa y en dispositivo la app se quedaba en el último paso.
  const [yaCompletado] = useState(() => usePreferenciasStore.getState().onboardingCompletado);

  // Ya visto antes de entrar: fuera (p. ej. si se abre /onboarding con un enlace).
  if (yaCompletado) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
