import { useRouter } from 'expo-router';
import { Pill } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { PasoOnboarding } from '@/features/onboarding/PasoOnboarding';
import { useTheme } from '@/theme/useTheme';

export default function Bienvenida() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <PasoOnboarding
      paso={1}
      icono={<Pill color={colors.primary} size={40} />}
      titulo="Te damos la bienvenida a PillTime"
      texto="Tu medicación, tus medidas y tus hábitos de salud en un solo sitio. Sin cuenta y sin conexión: todo lo que apuntes se queda en este móvil y no se envía a ningún servidor."
      pie={<Button label="Empezar" onPress={() => router.push('/onboarding/funciones')} />}
    />
  );
}
