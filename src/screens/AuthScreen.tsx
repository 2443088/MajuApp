import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { QRScannerModal } from '../components/QRScannerModal';
import { AppIcon, Input, Screen, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import { colors } from '../theme/colors';
import { normalizeStoreKey } from '../utils/format';

export function AuthScreen() {
  const { createStore, joinStore, syncEnabled } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [storeCode, setStoreCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => run(() => (mode === 'login' ? joinStore(storeCode) : createStore(storeName)));

  const handleScanned = (data: string) => {
    setScanning(false);
    const code = normalizeStoreKey(data);
    setStoreCode(code);
    void run(() => joinStore(code));
  };

  const isLogin = mode === 'login';
  const disabled = loading || (isLogin ? storeCode.trim().length < 4 : storeName.trim().length < 2);

  return (
    <Screen className="bg-red-50/40">
      <View className="mb-11 mt-6 flex-row items-center gap-3.5">
        <View
          className="h-[68px] w-[68px] items-center justify-center rounded-[21px] bg-red-600"
          style={{ transform: [{ rotate: '-3deg' }], elevation: 6 }}
        >
          <Txt className="font-script text-[32px] text-white">MJ</Txt>
        </View>
        <View>
          <Txt className="text-[28px] font-dm-bold text-red-700">MJ</Txt>
          <Txt className="mt-0.5 text-sm text-zinc-500">Mama Jualan</Txt>
        </View>
      </View>

      <View className="rounded-[26px] border border-zinc-100 bg-white px-[21px] pb-5 pt-6" style={{ elevation: 3 }}>
        <Txt className="text-[13px] font-dm-bold uppercase tracking-wider text-red-600">
          {isLogin ? 'Selamat datang kembali' : 'Mulai bersama MJ'}
        </Txt>
        <Txt className="mt-1 text-[28px] font-dm-bold">{isLogin ? 'Hubungkan ke Toko' : 'Buat Toko Baru'}</Txt>
        <Txt className="mb-6 mt-2 text-[15px] leading-6 text-zinc-500">
          {isLogin
            ? 'Masukkan Kode Toko dari HP Mama, atau pindai QR Code-nya.'
            : 'Beri nama toko Anda. Kode Toko dibuat otomatis untuk menghubungkan HP lain.'}
        </Txt>

        {isLogin ? (
          <View className="gap-2">
            <Txt className="text-[15px] font-dm-bold">Kode Toko</Txt>
            <View className="h-[60px] flex-row items-center gap-2.5 rounded-2xl border border-zinc-200 px-4">
              <AppIcon name="box" size={21} color={colors.red600} />
              <Input
                value={storeCode}
                onChangeText={(text) => setStoreCode(text.toUpperCase())}
                placeholder="MJ-7K4Q9X"
                autoCapitalize="characters"
                autoCorrect={false}
                className="h-full flex-1 text-[17px] font-dm-semibold"
              />
              <Pressable
                onPress={() => setScanning(true)}
                accessibilityLabel="Pindai QR Code"
                className="h-10 w-10 items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
              >
                <AppIcon name="qr" size={20} color={colors.red600} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="gap-2">
            <Txt className="text-[15px] font-dm-bold">Nama Toko</Txt>
            <View className="h-[60px] flex-row items-center gap-2.5 rounded-2xl border border-zinc-200 px-4">
              <AppIcon name="home" size={21} color={colors.red600} />
              <Input
                value={storeName}
                onChangeText={setStoreName}
                placeholder="Ahua AYWE"
                className="h-full flex-1 text-[17px] font-dm-semibold"
              />
            </View>
          </View>
        )}

        {error ? (
          <View className="mt-4 flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AppIcon name="alert" size={18} color={colors.red600} />
            <Txt className="flex-1 text-[13px] leading-5 text-red-800">{error}</Txt>
          </View>
        ) : null}

        {!syncEnabled ? (
          <View className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Txt className="text-[13px] leading-5 text-yellow-900">
              Mode lokal: Firebase belum dikonfigurasi, jadi data tidak tersinkron ke HP lain. Isi file .env untuk
              mengaktifkan sinkronisasi.
            </Txt>
          </View>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={disabled}
          className={`mt-[18px] min-h-[58px] flex-row items-center justify-center gap-2 rounded-2xl ${
            disabled ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
          }`}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Txt className="text-[17px] font-dm-bold text-white">{isLogin ? 'Hubungkan' : 'Buat Toko & Masuk'}</Txt>
              <AppIcon name="chevron" size={20} color={colors.white} />
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setError(null);
            setMode(isLogin ? 'signup' : 'login');
          }}
          className="mt-2.5 min-h-[52px] items-center justify-center"
        >
          <Txt className="text-sm font-dm-bold text-red-600">
            {isLogin ? 'Belum punya toko? Buat Toko Baru' : 'Sudah punya toko? Hubungkan'}
          </Txt>
        </Pressable>
      </View>

      <View className="mt-7 flex-row items-center justify-center gap-2">
        <AppIcon name="heart" size={17} color={colors.red600} />
        <Txt className="text-[13px] text-zinc-400">Dibuat sederhana untuk Mama</Txt>
      </View>

      <QRScannerModal visible={scanning} onClose={() => setScanning(false)} onScanned={handleScanned} />
    </Screen>
  );
}
