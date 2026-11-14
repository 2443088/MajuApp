import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { AppIcon, BackHeader, Input, Screen, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { extractCoordinates, resolveMapsLink } from '../services/routeCalculator';
import { colors } from '../theme/colors';
import { normalizePhone } from '../utils/format';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Txt className="text-[15px] font-dm-bold">{label}</Txt>
      {children}
      {hint ? <Txt className="text-xs leading-[18px] text-zinc-500">{hint}</Txt> : null}
    </View>
  );
}

const BOX = 'rounded-[15px] border border-zinc-200 bg-white';

export function CustomerFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerForm'>>();
  const { allCustomers, saveCustomer, moveToTrash } = useStore();

  const existing = route.params?.customerId ? allCustomers[route.params.customerId] : undefined;
  const [name, setName] = useState(existing?.name ?? route.params?.prefillName ?? '');
  const [phone, setPhone] = useState(existing?.whatsapp_number ?? '');
  const [address, setAddress] = useState(existing?.address_text ?? '');
  const [landmark, setLandmark] = useState(existing?.landmark ?? '');
  const [mapsLink, setMapsLink] = useState(existing?.maps_url ?? '');
  const [saving, setSaving] = useState(false);

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setMapsLink(text.trim());
  };

  const save = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (name.trim().length < 2) return Alert.alert('Nama belum diisi', 'Tulis nama pelanggan.');
    if (normalizedPhone.length < 9) return Alert.alert('Nomor HP tidak valid', 'Tulis nomor WhatsApp / HP pelanggan.');
    if (address.trim().length < 3) return Alert.alert('Alamat belum diisi', 'Tulis alamat lengkap pelanggan.');

    setSaving(true);
    try {
      const link = mapsLink.trim();
      let coordinates = existing?.coordinates ?? null;
      let coordinatesFailed = false;

      if (!link) {
        coordinates = null;
      } else if (link !== existing?.maps_url || !coordinates) {
        coordinates = extractCoordinates(link) ?? (await resolveMapsLink(link)).coordinates;
        coordinatesFailed = coordinates === null;
      }

      saveCustomer({
        id: existing?.id,
        name,
        whatsapp_number: normalizedPhone,
        address_text: address,
        landmark,
        maps_url: link,
        coordinates,
      });

      if (coordinatesFailed) {
        Alert.alert(
          'Pelanggan tersimpan',
          'Koordinat dari link belum terbaca (butuh internet untuk link pendek). Pelanggan ini belum ikut rute otomatis. Buka ulang dan simpan lagi saat online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        navigation.goBack();
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Hapus pelanggan?', `${existing.name} dipindah ke Space dan bisa dipulihkan selama 7 hari.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          moveToTrash('customers', existing.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const footer = (
    <View className="border-t border-zinc-100 bg-white px-[22px] py-3.5">
      <Pressable
        onPress={() => void save()}
        disabled={saving}
        className="min-h-[58px] items-center justify-center rounded-[17px] bg-red-600 active:bg-red-700"
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Txt className="text-[17px] font-dm-bold text-white">Simpan Pelanggan</Txt>
        )}
      </Pressable>
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackHeader
        title={existing ? 'Ubah Pelanggan' : 'Tambah Pelanggan Baru'}
        subtitle="Pelanggan"
        onBack={() => navigation.goBack()}
      />

      <View className="gap-5">
        <Field label="Nama Pelanggan">
          <Input value={name} onChangeText={setName} placeholder="Contoh: Ibu Lusiana" className={`h-[58px] px-4 text-base ${BOX}`} />
        </Field>

        <Field label="Nomor WhatsApp / HP">
          <View className={`h-[58px] flex-row items-center overflow-hidden ${BOX}`}>
            <View className="h-[30px] justify-center border-r border-zinc-200 px-3.5">
              <Txt className="font-dm-bold text-zinc-600">+62</Txt>
            </View>
            <Input
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="812 3456 7890"
              className="h-full flex-1 px-3.5 text-base"
            />
          </View>
        </Field>

        <Field label="Alamat Lengkap">
          <Input
            value={address}
            onChangeText={setAddress}
            multiline
            textAlignVertical="top"
            placeholder="Nama jalan, nomor rumah, RT/RW..."
            className={`min-h-[114px] px-4 pt-4 text-base ${BOX}`}
          />
        </Field>

        <Field label="Patokan (opsional)">
          <Input
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Contoh: pagar hitam dekat toko kelontong"
            className={`h-[58px] px-4 text-base ${BOX}`}
          />
        </Field>

        <Field
          label="Link Google Maps"
          hint="Buka lokasi pelanggan di Google Maps, pilih Bagikan, salin tautan, lalu tekan Tempel. Dipakai untuk rute antar otomatis."
        >
          <View className={`h-[58px] flex-row items-center overflow-hidden ${BOX}`}>
            <View className="pl-3.5">
              <AppIcon name="map" size={21} color={colors.red600} />
            </View>
            <Input
              value={mapsLink}
              onChangeText={setMapsLink}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Tempel link lokasi"
              className="h-full flex-1 px-3 text-base"
            />
            <Pressable onPress={() => void paste()} className="mr-[7px] h-[42px] justify-center rounded-[11px] bg-red-50 px-3 active:bg-red-100">
              <Txt className="font-dm-bold text-red-600">Tempel</Txt>
            </Pressable>
          </View>
        </Field>

        {existing ? (
          <Pressable onPress={confirmDelete} className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 active:bg-red-100">
            <AppIcon name="trash" size={18} color={colors.red600} />
            <Txt className="font-dm-bold text-red-600">Hapus pelanggan ini</Txt>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
