import { Redirect, Stack } from 'expo-router';

import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { useTheme } from '@/theme/useTheme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const onboardingCompletado = usePreferenciasStore((s) => s.onboardingCompletado);

  // Ya visto: fuera (p. ej. si se abre /onboarding con un enlace).
  if (onboardingCompletado) return <Redirect href="/" />;

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
