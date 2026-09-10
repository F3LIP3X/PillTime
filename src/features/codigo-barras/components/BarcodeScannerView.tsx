import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Button } from '@/components/Button';
import { spacing } from '@/theme/spacing';

type Props = {
  onScanned: (codigoBarras: string) => void;
};

export function BarcodeScannerView({ onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.centrado}>
        <Text>Necesitamos permiso de cámara para escanear el código de barras.</Text>
        <Button label="Dar permiso" onPress={requestPermission} />
      </View>
    );
  }

  const handleScan = (result: BarcodeScanningResult) => {
    if (escaneado) return;
    setEscaneado(true);
    onScanned(result.data);
  };

  return (
    <CameraView
      style={styles.camara}
      barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
      onBarcodeScanned={handleScan}
    />
  );
}

const styles = StyleSheet.create({
  camara: { flex: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
