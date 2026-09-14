import { useRouter } from 'expo-router';
import { CircleCheckBig } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PasoOnboarding } from '@/features/onboarding/PasoOnboarding';
import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { useTheme } from '@/theme/useTheme';

export default function Listo() {
  const { colors } = useTheme();
  const completarOnboarding = usePreferenciasStore((s) => s.completarOnboarding);
  const router = useRouter();

  // Primero el flag (Zustand es síncrono) y después navegar: si fuera al
  // revés, (tabs)/_layout vería el flag aún a false y devolvería aquí.
  // Navegación explícita, no un guard que reaccione al flag: ver app/_layout.tsx.
  const empezar = () => {
    completarOnboarding();
    router.replace('/');
  };

  return (
    <PasoOnboarding
      paso={4}
      icono={<CircleCheckBig color={colors.primary} size={40} />}
      titulo="Todo listo"
      texto="Añade tu primer medicamento y te avisaremos a la hora de cada toma. Ahora te pediremos permiso para enviarte esos avisos."
      pie={<Button label="Empezar a usar PillTime" onPress={empezar} />}
    />
  );
}
