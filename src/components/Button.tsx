import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { MIN_TOUCH_TARGET, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const backgroundColor = variant === 'primary' ? colors.primary : colors.secondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[typography.body, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
