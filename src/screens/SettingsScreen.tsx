import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppIcon, BackHeader, Input, Screen, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { exportBackupJson } from '../services/backup';
import { pickLogoImage } from '../services/imageService';
import { extractCoordinates, resolveMapsLink } from '../services/routeCalculator';
import { colors } from '../theme/colors';
import { normalizePhone } from '../utils/format';

const BOX = 'h-[54px] rounded-[15px] border border-zinc-200 bg-white px-4 text-base';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 gap-3 rounded-[20px] border border-zinc-100 bg-white p-[18px]">
      <Txt className="text-[17px] font-dm-bold">{title}</Txt>
      {children}
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, profile, saveStoreProfile, online, syncEnabled, syncError, activeDevices, logos, saveLogo, deleteLogo, updateLogoName } = useStore();

  const [storeName, setStoreName] = useState(profile?.store_name ?? '');
  const [phone, setPhone] = useState(profile?.phone_number ?? '');
  const [address, setAddress] = useState(profile?.origin_address ?? '');
  const [mapsLink, setMapsLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Logo management state
  const [addLogoModalOpen, setAddLogoModalOpen] = useState(false);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoTempUri, setNewLogoTempUri] = useState<string | null>(null);
  const [renameLogoId, setRenameLogoId] = useState<string | null>(null);
  const [renameLogoName, setRenameLogoName] = useState('');

  const storeKey = session?.store_key ?? '';
  const origin = profile?.origin_coordinates ?? null;

  const handlePickLogo = async () => {
    const picked = await pickLogoImage();
    if (!picked) return;
    setNewLogoTempUri(picked.uri);
    setNewLogoName('Logo Baru');
    setAddLogoModalOpen(true);
  };

  const handleSaveNewLogo = async () => {
    if (!newLogoTempUri) return;
    try {
      await saveLogo(newLogoName, newLogoTempUri);
      setAddLogoModalOpen(false);
      setNewLogoTempUri(null);
    } catch {
      Alert.alert('Gagal menyimpan logo', 'Coba ulangi pemilihan gambar logo.');
    }
  };

  const handleSaveRenameLogo = async () => {
    if (!renameLogoId) return;
    await updateLogoName(renameLogoId, renameLogoName);
    setRenameLogoId(null);
    setRenameLogoName('');
  };

  const confirmDeleteLogo = (logoId: string, lName: string) => {
    Alert.alert('Hapus Logo?', `Yakin ingin menghapus logo "${lName}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => void deleteLogo(logoId),
      },
    ]);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      let coordinates = origin;
      const link = mapsLink.trim();
      if (link) {
        coordinates = extractCoordinates(link) ?? (await resolveMapsLink(link)).coordinates;
        if (!coordinates) {
          Alert.alert(
            'Koordinat belum terbaca',
            'Link Google Maps tidak berisi koordinat atau Anda sedang offline. Coba lagi saat online, atau tempel link panjang.',
          );
          return;
        }
      }
      saveStoreProfile({
        store_name: storeName,
        phone_number: normalizePhone(phone),
        origin_address: address.trim(),
        origin_coordinates: coordinates,
      });
      setMapsLink('');
      Alert.alert('Tersimpan', 'Pengaturan toko diperbarui.');
    } finally {
      setSaving(false);
    }
  };

  const pasteLink = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setMapsLink(text.trim());
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(storeKey);
    Alert.alert('Kode disalin', storeKey);
  };

  const shareCode = () => {
    Share.share({
      message: `Hubungkan ke toko ${profile?.store_name ?? ''} di aplikasi MJ (Mama Jualan).\nKode Toko: ${storeKey}`,
    }).catch(() => undefined);
  };

  const backup = async () => {
    setExporting(true);
    try {
      await exportBackupJson(storeKey);
    } catch (error) {
      Alert.alert('Cadangan gagal', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const syncText = !syncEnabled
    ? 'Mode lokal (Firebase belum dikonfigurasi)'
    : online
      ? `Tersinkron, ${Math.max(1, activeDevices)} perangkat aktif`
      : 'Offline, perubahan dikirim saat online';

  return (
    <Screen>
      <BackHeader title="Pengaturan Toko" subtitle="Kelola" onBack={() => navigation.goBack()} />

      <Card title="Kode Toko">
        <Txt className="text-sm leading-5 text-zinc-500">
          Masukkan kode ini atau pindai QR di HP lain untuk menghubungkannya ke toko ini. Siapa pun yang tahu kode ini
          bisa melihat dan mengubah data toko, jadi bagikan hanya ke orang yang dipercaya.
        </Txt>
        <View className="items-center rounded-2xl bg-red-50 py-5">
          <View className="rounded-2xl bg-white p-3.5">
            <QRCode value={storeKey || 'MJ'} size={150} color="#18181b" backgroundColor="#ffffff" />
          </View>
          <Txt className="mt-3 text-[26px] font-dm-bold tracking-widest text-red-700">{storeKey}</Txt>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={() => void copyCode()} className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white active:bg-zinc-100">
            <AppIcon name="copy" size={18} color={colors.zinc700} />
            <Txt className="font-dm-bold">Salin</Txt>
          </Pressable>
          <Pressable onPress={shareCode} className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-600 active:bg-red-700">
            <AppIcon name="share" size={18} color={colors.white} />
            <Txt className="font-dm-bold text-white">Bagikan</Txt>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5">
          <AppIcon name={online && syncEnabled ? 'cloud' : 'cloud-off'} size={16} color={colors.zinc600} />
          <Txt className="flex-1 text-[13px] text-zinc-600">{syncText}</Txt>
        </View>
        {syncError ? (
          <View className="flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AppIcon name="alert" size={16} color={colors.red600} />
            <Txt className="flex-1 text-[13px] leading-5 text-red-800">{syncError}</Txt>
          </View>
        ) : null}
      </Card>

      <Card title="Profil Toko">
        <View className="gap-1.5">
          <Txt className="text-sm font-dm-bold">Nama Toko</Txt>
          <Input value={storeName} onChangeText={setStoreName} className={BOX} />
        </View>
        <View className="gap-1.5">
          <Txt className="text-sm font-dm-bold">Nomor HP Toko</Txt>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0812 3456 7890" className={BOX} />
        </View>
        <View className="gap-1.5">
          <Txt className="text-sm font-dm-bold">Alamat Rumah (titik awal rute)</Txt>
          <Input
            value={address}
            onChangeText={setAddress}
            multiline
            textAlignVertical="top"
            placeholder="Jl. Gerilya No. 20"
            className="min-h-[84px] rounded-[15px] border border-zinc-200 bg-white px-4 pt-3.5 text-base"
          />
        </View>
        <View className="gap-1.5">
          <Txt className="text-sm font-dm-bold">Link Google Maps rumah</Txt>
          <View className="h-[54px] flex-row items-center overflow-hidden rounded-[15px] border border-zinc-200 bg-white">
            <View className="pl-3.5">
              <AppIcon name="map" size={20} color={colors.red600} />
            </View>
            <Input
              value={mapsLink}
              onChangeText={setMapsLink}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={origin ? 'Tempel link baru untuk mengganti' : 'Tempel link lokasi rumah'}
              className="h-full flex-1 px-3 text-base"
            />
            <Pressable onPress={() => void pasteLink()} className="mr-1.5 h-[40px] justify-center rounded-[11px] bg-red-50 px-3 active:bg-red-100">
              <Txt className="font-dm-bold text-red-600">Tempel</Txt>
            </Pressable>
          </View>
          <Txt className={`text-xs ${origin ? 'text-green-700' : 'text-amber-600'}`}>
            {origin
              ? `Koordinat tersimpan: ${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}`
              : 'Belum diatur. Rute antar otomatis butuh titik awal ini.'}
          </Txt>
        </View>
        <Pressable
          onPress={() => void saveProfile()}
          disabled={saving}
          className="min-h-[52px] items-center justify-center rounded-[14px] bg-red-600 active:bg-red-700"
        >
          {saving ? <ActivityIndicator color={colors.white} /> : <Txt className="font-dm-bold text-white">Simpan Pengaturan</Txt>}
        </Pressable>
      </Card>

      <Card title="Logo Toko (Branding Postingan)">
        <Txt className="text-sm leading-5 text-zinc-500">
          Simpan logo toko untuk berbagai kebutuhan postingan (mis. Logo Menu, Logo Utama, Logo Watermark). Anda
          dapat memilih logo mana yang digunakan saat membuat poster di Space.
        </Txt>

        <View className="gap-2.5">
          {logos.map((l) => (
            <View
              key={l.id}
              className="flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3"
            >
              <View className="h-12 w-16 items-center justify-center rounded-xl bg-zinc-50 p-1 border border-zinc-100">
                <Image source={{ uri: l.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
              <View className="flex-1">
                <Txt className="font-dm-bold text-base" numberOfLines={1}>
                  {l.name}
                </Txt>
                <Txt className="text-xs text-zinc-400">Tersimpan untuk poster</Txt>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => {
                    setRenameLogoId(l.id);
                    setRenameLogoName(l.name);
                  }}
                  className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 active:bg-zinc-200"
                >
                  <AppIcon name="edit" size={15} color={colors.zinc700} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDeleteLogo(l.id, l.name)}
                  className="h-9 w-9 items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
                >
                  <AppIcon name="trash" size={15} color={colors.red600} />
                </Pressable>
              </View>
            </View>
          ))}
          {logos.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-zinc-200 p-5">
              <Txt className="text-sm text-zinc-400">Belum ada logo. Tambahkan logo pertama toko Anda.</Txt>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => void handlePickLogo()}
          className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-red-500 bg-red-50/60 active:bg-red-50"
        >
          <AppIcon name="plus" size={18} color={colors.red600} />
          <Txt className="font-dm-bold text-red-600">Tambah Logo Baru</Txt>
        </Pressable>
      </Card>

      <Card title="Cadangan Data">
        <Txt className="text-sm leading-5 text-zinc-500">
          Ekspor pelanggan, menu, dan pesanan ke satu berkas .json. Simpan ke Google Drive atau kirim ke WhatsApp
          sebagai cadangan bila HP rusak atau diganti. Foto menu tidak ikut diekspor.
        </Txt>
        <Pressable
          onPress={() => void backup()}
          disabled={exporting}
          className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-[14px] border border-red-500 bg-white active:bg-red-50"
        >
          {exporting ? (
            <ActivityIndicator color={colors.red600} />
          ) : (
            <>
              <AppIcon name="download" size={19} color={colors.red600} />
              <Txt className="font-dm-bold text-red-600">Ekspor Cadangan (.json)</Txt>
            </>
          )}
        </Pressable>
      </Card>

      <Txt className="mt-1 text-center text-xs text-zinc-400">MJ (Mama Jualan) v2.1</Txt>

      {/* Modal Tambah Logo Baru */}
      <Modal
        transparent
        visible={addLogoModalOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAddLogoModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-zinc-900/40 px-5">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <Txt className="mb-1 text-lg font-dm-bold">Simpan Logo Baru</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">
              Beri nama atau fungsi logo (mis. Logo Menu, Logo Utama, Logo Watermark)
            </Txt>
            {newLogoTempUri ? (
              <View className="mb-4 h-24 items-center justify-center rounded-xl bg-zinc-50 p-2 border border-zinc-100">
                <Image source={{ uri: newLogoTempUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
            ) : null}
            <Input
              value={newLogoName}
              onChangeText={setNewLogoName}
              placeholder="Contoh: Logo Menu"
              autoFocus
              className="mb-4 h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-base"
            />
            <View className="flex-row justify-end gap-2">
              <Pressable
                onPress={() => {
                  setAddLogoModalOpen(false);
                  setNewLogoTempUri(null);
                }}
                className="min-h-[42px] items-center justify-center rounded-xl px-4 active:bg-zinc-100"
              >
                <Txt className="font-dm-semibold text-zinc-600">Batal</Txt>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveNewLogo()}
                className="min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-5 active:bg-red-700"
              >
                <Txt className="font-dm-bold text-white">Simpan</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ubah Nama Logo */}
      <Modal
        transparent
        visible={renameLogoId !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRenameLogoId(null)}
      >
        <View className="flex-1 items-center justify-center bg-zinc-900/40 px-5">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <Txt className="mb-1 text-lg font-dm-bold">Ubah Nama Logo</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">Ganti label atau kegunaan logo ini</Txt>
            <Input
              value={renameLogoName}
              onChangeText={setRenameLogoName}
              placeholder="Nama logo..."
              autoFocus
              className="mb-4 h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-base"
            />
            <View className="flex-row justify-end gap-2">
              <Pressable
                onPress={() => setRenameLogoId(null)}
                className="min-h-[42px] items-center justify-center rounded-xl px-4 active:bg-zinc-100"
              >
                <Txt className="font-dm-semibold text-zinc-600">Batal</Txt>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveRenameLogo()}
                className="min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-5 active:bg-red-700"
              >
                <Txt className="font-dm-bold text-white">Simpan</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
