import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Props = TextInputProps & { label: string };

export function TextField({ label, style, ...props }: Props) {
  const { colors, esOscuro } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          typography.body,
          styles.input,
          {
            color: colors.text,
            borderColor: colors.textSecondary + '55',
            backgroundColor: esOscuro ? '#1B2626' : '#FFFFFF',
          },
          style,
        ]}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
});
