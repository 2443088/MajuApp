import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { AppIcon, Txt } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}

export function QRScannerModal({ visible, onClose, onScanned }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  useEffect(() => {
    if (visible) handled.current = false;
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              handled.current = true;
              onScanned(data);
            }}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <AppIcon name="qr" size={48} color={colors.white} />
            <Txt className="text-center text-base text-white">
              Izinkan kamera untuk memindai QR Code dari HP Mama.
            </Txt>
            <Pressable onPress={() => void requestPermission()} className="rounded-2xl bg-red-600 px-6 py-3.5">
              <Txt className="font-dm-bold text-white">Izinkan Kamera</Txt>
            </Pressable>
          </View>
        )}

        <View className="absolute inset-x-0 items-center" style={{ top: insets.top + 16 }} pointerEvents="none">
          <View className="rounded-full bg-black/60 px-4 py-2">
            <Txt className="text-sm text-white">Arahkan kamera ke QR Code toko</Txt>
          </View>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityLabel="Tutup pemindai"
          className="absolute right-5 h-12 w-12 items-center justify-center rounded-full bg-black/60"
          style={{ top: insets.top + 8 }}
        >
          <AppIcon name="x" color={colors.white} />
        </Pressable>
      </View>
    </Modal>
  );
}
