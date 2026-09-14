import { CircleCheckBig } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PasoOnboarding } from '@/features/onboarding/PasoOnboarding';
import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { useTheme } from '@/theme/useTheme';

export default function Listo() {
  const { colors } = useTheme();
  const completarOnboarding = usePreferenciasStore((s) => s.completarOnboarding);

  return (
    <PasoOnboarding
      paso={4}
      icono={<CircleCheckBig color={colors.primary} size={40} />}
      titulo="Todo listo"
      texto="Añade tu primer medicamento y te avisaremos a la hora de cada toma. Ahora te pediremos permiso para enviarte esos avisos."
      // No hace falta navegar: al completar, el guard de app/_layout.tsx
      // deja de permitir el onboarding y Expo Router lleva a las pestañas.
      pie={<Button label="Empezar a usar PillTime" onPress={completarOnboarding} />}
    />
  );
}
