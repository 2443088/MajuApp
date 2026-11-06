import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { AppIcon, BackHeader, Input, Screen, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { pickMenuPhoto, removeFile, type PreparedPhoto } from '../services/imageService';
import { colors } from '../theme/colors';
import { formatNumber, makeId } from '../utils/format';

export function MenuFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MenuForm'>>();
  const { allMenu, labels, addLabel, saveMenuItem, moveToTrash } = useStore();

  const existing = route.params?.menuId ? allMenu[route.params.menuId] : undefined;
  const [menuId] = useState(() => existing?.id ?? makeId('MENU'));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [selectedLabel, setSelectedLabel] = useState(existing?.label ?? '');
  const [photo, setPhoto] = useState<PreparedPhoto | undefined>();
  const [picking, setPicking] = useState(false);
  const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');

  // Foto yang dipilih tapi tidak jadi disimpan harus dibersihkan dari penyimpanan.
  const photoRef = useRef<PreparedPhoto | undefined>(undefined);
  const savedRef = useRef(false);
  useEffect(
    () => () => {
      if (!savedRef.current && photoRef.current) void removeFile(photoRef.current.uri);
    },
    [],
  );

  const previewUri = photo?.uri ?? existing?.image_uri;
  const numericPrice = parseInt(price || '0', 10);

  const choosePhoto = async () => {
    setPicking(true);
    try {
      const prepared = await pickMenuPhoto(menuId, Date.now());
      if (prepared) {
        if (photoRef.current) void removeFile(photoRef.current.uri);
        photoRef.current = prepared;
        setPhoto(prepared);
      }
    } catch {
      Alert.alert('Foto gagal diproses', 'Coba pilih foto lain.');
    } finally {
      setPicking(false);
    }
  };

  const handleCreateLabel = () => {
    const trimmed = newLabelInput.trim();
    if (!trimmed) {
      Alert.alert('Nama label kosong', 'Masukkan nama label atau kategori.');
      return;
    }
    addLabel(trimmed);
    setSelectedLabel(trimmed);
    setNewLabelInput('');
    setShowAddLabelModal(false);
  };

  const save = () => {
    if (title.trim().length < 2) return Alert.alert('Nama menu belum diisi', 'Tulis nama produk / menu.');
    if (numericPrice <= 0) return Alert.alert('Harga belum diisi', 'Tulis harga lebih dari 0.');
    savedRef.current = true;
    saveMenuItem({
      id: menuId,
      title,
      price: numericPrice,
      is_active: existing?.is_active ?? true,
      label: selectedLabel.trim() || undefined,
      photo,
    });
    navigation.goBack();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Hapus menu?', `${existing.title} dipindah ke Space dan bisa dipulihkan selama 7 hari.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          moveToTrash('menu_items', existing.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const footer = (
    <View className="border-t border-zinc-100 bg-white px-[22px] py-3.5">
      <Pressable onPress={save} className="min-h-[58px] items-center justify-center rounded-[17px] bg-red-600 active:bg-red-700">
        <Txt className="text-[17px] font-dm-bold text-white">Simpan Menu</Txt>
      </Pressable>
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackHeader title={existing ? 'Ubah Menu' : 'Tambah Menu Baru'} subtitle="Menu Makanan" onBack={() => navigation.goBack()} />

      <View className="gap-5">
        <View className="gap-2">
          <Txt className="text-[15px] font-dm-bold">Foto Produk</Txt>
          <Pressable
            onPress={() => void choosePhoto()}
            disabled={picking}
            className="w-full items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed border-red-300 bg-red-50/60"
            style={{ aspectRatio: 1, maxHeight: 286 }}
          >
            {picking ? (
              <ActivityIndicator color={colors.red600} />
            ) : previewUri ? (
              <>
                <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <View className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-full bg-black/60 px-3 py-2">
                  <AppIcon name="edit" size={14} color={colors.white} />
                  <Txt className="text-xs font-dm-semibold text-white">Ganti foto</Txt>
                </View>
              </>
            ) : (
              <View className="items-center">
                <View className="mb-3 h-[66px] w-[66px] items-center justify-center rounded-[20px] bg-red-100">
                  <AppIcon name="image" size={32} color={colors.red600} />
                </View>
                <Txt className="text-[17px] font-dm-bold text-red-600">Tambah Foto</Txt>
                <Txt className="mt-1 text-xs text-zinc-400">Otomatis dipotong persegi dan dikecilkan</Txt>
              </View>
            )}
          </Pressable>
        </View>

        <View className="gap-2">
          <Txt className="text-[15px] font-dm-bold">Nama Produk / Menu</Txt>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Contoh: Nasi Ayam Mama"
            className="h-[58px] rounded-[15px] border border-zinc-200 bg-white px-4 text-base"
          />
        </View>

        <View className="gap-2">
          <Txt className="text-[15px] font-dm-bold">Harga</Txt>
          <View className="h-[58px] flex-row items-center overflow-hidden rounded-[15px] border border-zinc-200 bg-white">
            <View className="h-[30px] justify-center border-r border-zinc-200 px-3.5">
              <Txt className="font-dm-bold text-zinc-600">Rp</Txt>
            </View>
            <Input
              value={price ? formatNumber(numericPrice) : ''}
              onChangeText={(text) => setPrice(text.replace(/\D/g, '').slice(0, 9))}
              keyboardType="number-pad"
              placeholder="0"
              className="h-full flex-1 px-3.5 text-base"
            />
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Txt className="text-[15px] font-dm-bold">Label / Kategori Menu</Txt>
            <Pressable onPress={() => setShowAddLabelModal(true)} hitSlop={8} className="flex-row items-center gap-1">
              <AppIcon name="plus" size={14} color={colors.red600} />
              <Txt className="text-[13px] font-dm-bold text-red-600">Buat Label Baru</Txt>
            </Pressable>
          </View>
          <Txt className="text-xs text-zinc-400">
            Kelompokkan menu agar rapi di daftar menu poster (mis. SIDE DISH, MIE, SNACK & DESSERT).
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="py-1">
            <Pressable
              onPress={() => setSelectedLabel('')}
              className={`min-h-[42px] px-3.5 items-center justify-center rounded-xl border ${
                !selectedLabel ? 'border-2 border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
              }`}
            >
              <Txt className={`text-[13px] font-dm-semibold ${!selectedLabel ? 'text-red-700' : 'text-zinc-600'}`}>
                Tanpa Label
              </Txt>
            </Pressable>
            {labels.map((lbl) => {
              const isSelected = selectedLabel === lbl;
              return (
                <Pressable
                  key={lbl}
                  onPress={() => setSelectedLabel(lbl)}
                  className={`min-h-[42px] px-3.5 items-center justify-center rounded-xl border ${
                    isSelected ? 'border-2 border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
                  }`}
                >
                  <Txt className={`text-[13px] font-dm-semibold ${isSelected ? 'text-red-700' : 'text-zinc-600'}`}>
                    {lbl}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {existing ? (
          <Pressable onPress={confirmDelete} className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 active:bg-red-100">
            <AppIcon name="trash" size={18} color={colors.red600} />
            <Txt className="font-dm-bold text-red-600">Hapus menu ini</Txt>
          </Pressable>
        ) : null}
      </View>

      <Modal
        transparent
        visible={showAddLabelModal}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowAddLabelModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-zinc-900/40 px-5">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <Txt className="mb-1 text-lg font-dm-bold">Buat Label Baru</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">
              Contoh: SIDE DISH, MIE, SNACK & DESSERT, MINUMAN
            </Txt>
            <Input
              value={newLabelInput}
              onChangeText={setNewLabelInput}
              placeholder="Nama label"
              autoFocus
              className="mb-4 h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-base"
            />
            <View className="flex-row justify-end gap-2">
              <Pressable
                onPress={() => {
                  setNewLabelInput('');
                  setShowAddLabelModal(false);
                }}
                className="min-h-[42px] items-center justify-center rounded-xl px-4 active:bg-zinc-100"
              >
                <Txt className="font-dm-semibold text-zinc-600">Batal</Txt>
              </Pressable>
              <Pressable
                onPress={handleCreateLabel}
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
