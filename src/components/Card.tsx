import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';

export function Card({ style, ...props }: ViewProps) {
  const { colors, esOscuro } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: esOscuro ? '#1B2626' : '#FFFFFF', borderColor: colors.textSecondary + '22' },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
