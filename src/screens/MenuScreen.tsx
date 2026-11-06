import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppIcon, Avatar, Input, Screen, SectionTitle, Toggle, Txt, type IconName } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { buildSearchUrl, buildSingleStopUrl } from '../services/routeCalculator';
import { colors } from '../theme/colors';
import type { Customer } from '../types';
import { displayPhone, formatRupiah } from '../utils/format';

type Tab = 'Semua' | 'Pelanggan' | 'Menu Makanan';
const TABS: Tab[] = ['Semua', 'Pelanggan', 'Menu Makanan'];
const PREVIEW_COUNT = 3;

function openCustomerMap(customer: Customer) {
  const url = customer.coordinates
    ? buildSingleStopUrl(customer.coordinates)
    : customer.maps_url || (customer.address_text ? buildSearchUrl(customer.address_text) : '');
  if (!url) {
    Alert.alert('Lokasi belum ada', 'Tambahkan link Google Maps atau alamat pada data pelanggan.');
    return;
  }
  Linking.openURL(url).catch(() => Alert.alert('Tidak bisa membuka peta'));
}

function waUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return `https://wa.me/${digits}`;
  if (digits.startsWith('0')) return `https://wa.me/62${digits.slice(1)}`;
  return `https://wa.me/62${digits}`;
}

function openWhatsApp(phone: string | undefined, name: string) {
  if (!phone || !phone.trim()) {
    Alert.alert('Nomor WhatsApp belum diisi', `Tambahkan nomor telepon untuk ${name} terlebih dahulu.`);
    return;
  }
  const url = waUrl(phone);
  if (!url) {
    Alert.alert('Nomor tidak valid', 'Periksa kembali nomor telepon pelanggan.');
    return;
  }
  Linking.openURL(url).catch(() => Alert.alert('Tidak bisa membuka WhatsApp'));
}

function SheetOption({ icon, title, hint, onPress }: { icon: IconName; title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[91px] flex-row items-center gap-3 rounded-[19px] border border-zinc-200 bg-white p-3.5 active:bg-zinc-50"
    >
      <View className="h-[53px] w-[53px] items-center justify-center rounded-2xl bg-red-100">
        <AppIcon name={icon} size={28} color={colors.red600} />
      </View>
      <View className="flex-1">
        <Txt className="text-base font-dm-bold">{title}</Txt>
        <Txt className="mt-0.5 text-[13px] text-zinc-500">{hint}</Txt>
      </View>
      <AppIcon name="chevron" size={21} color={colors.zinc400} />
    </Pressable>
  );
}

export function MenuScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { customers, menu, setMenuActive, labels, addLabel, renameLabel, deleteLabel, moveMenuItemsToLabel } = useStore();
  const [tab, setTab] = useState<Tab>('Semua');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [showAllMenu, setShowAllMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Label filter & selection state
  const [activeLabelFilter, setActiveLabelFilter] = useState<string>('Semua');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [manageLabelsModalOpen, setManageLabelsModalOpen] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [renameOldLabel, setRenameOldLabel] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const showClients = tab === 'Semua' || tab === 'Pelanggan';
  const showFood = tab === 'Semua' || tab === 'Menu Makanan';
  const expandCustomers = showAllCustomers || tab === 'Pelanggan';
  const expandMenu = showAllMenu || tab === 'Menu Makanan' || isSelectMode || activeLabelFilter !== 'Semua';

  const q = searchQuery.trim().toLowerCase();

  const filteredMenu = useMemo(() => {
    let base = menu;
    if (activeLabelFilter === '__NO_LABEL__') base = menu.filter((m) => !m.label || !m.label.trim());
    else if (activeLabelFilter !== 'Semua') base = menu.filter((m) => m.label?.trim() === activeLabelFilter);
    if (!q) return base;
    return base.filter((m) => m.title.toLowerCase().includes(q));
  }, [menu, activeLabelFilter, q]);

  const filteredCustomers = useMemo(() => {
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp_number ?? '').toLowerCase().includes(q) ||
        (c.address_text ?? '').toLowerCase().includes(q),
    );
  }, [customers, q]);

  const visibleCustomers = expandCustomers ? filteredCustomers : filteredCustomers.slice(0, PREVIEW_COUNT);
  const visibleMenu = expandMenu ? filteredMenu : filteredMenu.slice(0, PREVIEW_COUNT);

  const toggleSelectMenu = (id: string) => {
    setSelectedMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAllMenu = () => {
    if (selectedMenuIds.length === filteredMenu.length) {
      setSelectedMenuIds([]);
    } else {
      setSelectedMenuIds(filteredMenu.map((m) => m.id));
    }
  };

  const handleApplyMove = (targetLabel?: string) => {
    if (selectedMenuIds.length === 0) return;
    moveMenuItemsToLabel(selectedMenuIds, targetLabel);
    const count = selectedMenuIds.length;
    setSelectedMenuIds([]);
    setIsSelectMode(false);
    setMoveModalOpen(false);
    Alert.alert('Berhasil Dipindahkan', `${count} menu berhasil dipindahkan ${targetLabel ? `ke label "${targetLabel}"` : 'ke Tanpa Label'}.`);
  };

  const handleCreateAndMove = () => {
    const trimmed = newLabelInput.trim();
    if (!trimmed) {
      Alert.alert('Nama label kosong', 'Tulis nama label terlebih dahulu.');
      return;
    }
    handleApplyMove(trimmed);
    setNewLabelInput('');
  };

  const handleAddLabelFromManager = () => {
    const trimmed = newLabelInput.trim();
    if (!trimmed) {
      Alert.alert('Nama label kosong', 'Tulis nama label terlebih dahulu.');
      return;
    }
    addLabel(trimmed);
    setNewLabelInput('');
  };

  const handleSaveRename = () => {
    if (!renameOldLabel) return;
    const trimmed = renameInput.trim();
    if (!trimmed) {
      Alert.alert('Nama baru kosong', 'Tulis nama label yang baru.');
      return;
    }
    renameLabel(renameOldLabel, trimmed);
    setRenameOldLabel(null);
    setRenameInput('');
  };

  const confirmDeleteLabel = (lbl: string) => {
    Alert.alert('Hapus Label?', `Menu yang menggunakan label "${lbl}" tidak akan dihapus, hanya labelnya yang dilepas.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          deleteLabel(lbl);
          if (activeLabelFilter === lbl) setActiveLabelFilter('Semua');
        },
      },
    ]);
  };

  const go = (screen: 'CustomerForm' | 'MenuForm') => {
    setSheetOpen(false);
    navigation.navigate(screen);
  };

  const handleAddNew = () => {
    if (tab === 'Pelanggan') { navigation.navigate('CustomerForm'); return; }
    if (tab === 'Menu Makanan') { navigation.navigate('MenuForm'); return; }
    setSheetOpen(true); // tab 'Semua'
  };

  return (
    <Screen tabBar>
      <AppHeader title="Menu & Pelanggan" subtitle="Kelola Toko" />

      <View className="flex-row rounded-[14px] bg-zinc-200/70 p-1">
        {TABS.map((name) => (
          <Pressable
            key={name}
            onPress={() => {
              setTab(name);
              setSearchQuery('');
              if (name === 'Pelanggan') setIsSelectMode(false);
            }}
            className={`min-h-[44px] flex-1 items-center justify-center rounded-[11px] ${tab === name ? 'bg-white' : ''}`}
          >
            <Txt className={`text-[13px] font-dm-semibold ${tab === name ? 'text-red-600' : 'text-zinc-500'}`}>{name}</Txt>
          </Pressable>
        ))}
      </View>

      {/* Search bar */}
      <View className="mt-3 flex-row items-center gap-2 rounded-[13px] border border-zinc-200 bg-white px-3">
        <AppIcon name="search" size={17} color={colors.zinc400} />
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            tab === 'Pelanggan'
              ? 'Cari pelanggan...'
              : tab === 'Menu Makanan'
              ? 'Cari menu makanan...'
              : 'Cari pelanggan atau menu...'
          }
          className="flex-1 py-3 text-sm"
          returnKeyType="search"
          clearButtonMode="never"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <AppIcon name="x" size={16} color={colors.zinc400} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={handleAddNew}
        className="mb-4 mt-3 min-h-[54px] flex-row items-center justify-center gap-2 rounded-[15px] border border-dashed border-red-500 bg-red-50/60 active:bg-red-50"
      >
        <AppIcon name="plus" size={20} color={colors.red600} />
        <Txt className="font-dm-bold text-red-600">Tambah Baru</Txt>
      </Pressable>

      {showClients ? (
        <View className="mb-6 gap-2.5">
          <View className="flex-row items-center justify-between">
            <SectionTitle title={`Pelanggan (${filteredCustomers.length}${q ? `/${customers.length}` : ''})`} />
            {filteredCustomers.length > PREVIEW_COUNT && tab === 'Semua' ? (
              <Pressable onPress={() => setShowAllCustomers((v) => !v)} hitSlop={8}>
                <Txt className="text-[13px] font-dm-bold text-red-600">{showAllCustomers ? 'Ringkas' : 'Lihat semua'}</Txt>
              </Pressable>
            ) : null}
          </View>
          {visibleCustomers.map((customer) => (
            <Pressable
              key={customer.id}
              onPress={() => navigation.navigate('CustomerForm', { customerId: customer.id })}
              className="flex-row items-center gap-3 rounded-[17px] border border-zinc-100 bg-white p-3 active:bg-zinc-50"
            >
              <Avatar label={customer.name} />
              <View className="flex-1">
                <Txt className="font-dm-bold" numberOfLines={1}>
                  {customer.name}
                </Txt>
                <Txt className="my-0.5 text-[13px] text-zinc-600">{displayPhone(customer.whatsapp_number)}</Txt>
                <Txt className="text-xs text-zinc-400" numberOfLines={1}>
                  {customer.address_text}
                </Txt>
                {!customer.coordinates ? (
                  <Txt className="mt-0.5 text-[11px] font-dm-semibold text-amber-600">Belum ada koordinat untuk rute</Txt>
                ) : null}
              </View>
              {/* WhatsApp button */}
              <Pressable
                onPress={() => openWhatsApp(customer.whatsapp_number, customer.name)}
                accessibilityLabel={`Buka WhatsApp untuk ${customer.name}`}
                className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-green-50 active:bg-green-100"
              >
                <AppIcon name="message" size={20} color="#25D366" />
              </Pressable>
              {/* Maps button */}
              <Pressable
                onPress={() => openCustomerMap(customer)}
                accessibilityLabel={`Buka peta untuk ${customer.name}`}
                className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
              >
                <AppIcon name="map" size={22} color={colors.red600} />
              </Pressable>
            </Pressable>
          ))}
          {filteredCustomers.length === 0 && customers.length > 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-zinc-200 p-5">
              <Txt className="text-sm text-zinc-400">Tidak ada hasil untuk &quot;{searchQuery}&quot;</Txt>
            </View>
          ) : null}
          {customers.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-zinc-200 p-5">
              <Txt className="text-sm text-zinc-400">Belum ada pelanggan. Tekan Tambah Baru.</Txt>
            </View>
          ) : null}
        </View>
      ) : null}

      {showFood ? (
        <View className="mb-6 gap-2.5">
          <View className="flex-row items-center justify-between">
            <SectionTitle title={`Menu Makanan (${filteredMenu.length}${q ? `/${menu.length}` : ''})`} />
            <View className="flex-row items-center gap-3">
              {menu.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setIsSelectMode((v) => !v);
                    setSelectedMenuIds([]);
                  }}
                  hitSlop={8}
                  className={`rounded-lg px-2.5 py-1 ${isSelectMode ? 'bg-red-600' : 'bg-zinc-100'}`}
                >
                  <Txt className={`text-[12px] font-dm-bold ${isSelectMode ? 'text-white' : 'text-zinc-700'}`}>
                    {isSelectMode ? 'Selesai' : 'Pilih Menu'}
                  </Txt>
                </Pressable>
              ) : null}
              {menu.length > PREVIEW_COUNT && tab === 'Semua' && !isSelectMode && activeLabelFilter === 'Semua' ? (
                <Pressable onPress={() => setShowAllMenu((v) => !v)} hitSlop={8}>
                  <Txt className="text-[13px] font-dm-bold text-red-600">{showAllMenu ? 'Ringkas' : 'Lihat semua'}</Txt>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Baris Filter Label & Kelola Label */}
          <View className="flex-row items-center gap-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} className="py-1">
              <Pressable
                onPress={() => setActiveLabelFilter('Semua')}
                className={`min-h-[34px] px-3 items-center justify-center rounded-full border ${
                  activeLabelFilter === 'Semua' ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
                }`}
              >
                <Txt className={`text-xs font-dm-semibold ${activeLabelFilter === 'Semua' ? 'text-white' : 'text-zinc-600'}`}>
                  Semua ({menu.length})
                </Txt>
              </Pressable>
              {labels.map((lbl) => {
                const count = menu.filter((m) => m.label?.trim() === lbl).length;
                const isSelected = activeLabelFilter === lbl;
                return (
                  <Pressable
                    key={lbl}
                    onPress={() => setActiveLabelFilter(lbl)}
                    className={`min-h-[34px] px-3 items-center justify-center rounded-full border ${
                      isSelected ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <Txt className={`text-xs font-dm-semibold ${isSelected ? 'text-white' : 'text-zinc-600'}`}>
                      {lbl} ({count})
                    </Txt>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setActiveLabelFilter('__NO_LABEL__')}
                className={`min-h-[34px] px-3 items-center justify-center rounded-full border ${
                  activeLabelFilter === '__NO_LABEL__' ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
                }`}
              >
                <Txt className={`text-xs font-dm-semibold ${activeLabelFilter === '__NO_LABEL__' ? 'text-white' : 'text-zinc-600'}`}>
                  Tanpa Label ({menu.filter((m) => !m.label || !m.label.trim()).length})
                </Txt>
              </Pressable>
            </ScrollView>
            <Pressable
              onPress={() => setManageLabelsModalOpen(true)}
              className="h-[34px] flex-row items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 active:bg-zinc-100"
            >
              <AppIcon name="tag" size={13} color={colors.zinc600} />
              <Txt className="text-xs font-dm-bold text-zinc-600">Kelola</Txt>
            </Pressable>
          </View>

          {/* Action Bar saat Mode Seleksi Aktif */}
          {isSelectMode ? (
            <View className="flex-row items-center justify-between rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5">
              <Pressable onPress={handleSelectAllMenu} className="flex-row items-center gap-2">
                <View
                  className={`h-5 w-5 items-center justify-center rounded-md border-2 ${
                    selectedMenuIds.length > 0 && selectedMenuIds.length === filteredMenu.length
                      ? 'border-red-600 bg-red-600'
                      : 'border-zinc-400 bg-white'
                  }`}
                >
                  {selectedMenuIds.length > 0 ? <AppIcon name="check" size={12} color={colors.white} /> : null}
                </View>
                <Txt className="text-xs font-dm-bold text-zinc-800">
                  {selectedMenuIds.length === 0 ? 'Pilih Semua' : `${selectedMenuIds.length} Dipilih`}
                </Txt>
              </Pressable>
              <Pressable
                disabled={selectedMenuIds.length === 0}
                onPress={() => setMoveModalOpen(true)}
                className={`flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 ${
                  selectedMenuIds.length > 0 ? 'bg-red-600 active:bg-red-700' : 'bg-zinc-300'
                }`}
              >
                <AppIcon name="folder" size={14} color={colors.white} />
                <Txt className="text-xs font-dm-bold text-white">Pindah ke Label</Txt>
              </Pressable>
            </View>
          ) : null}

          {visibleMenu.map((item) => {
            const isSelected = selectedMenuIds.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (isSelectMode) {
                    toggleSelectMenu(item.id);
                  } else {
                    navigation.navigate('MenuForm', { menuId: item.id });
                  }
                }}
                className={`flex-row items-center gap-3 rounded-[17px] border p-3 active:bg-zinc-50 ${
                  isSelected ? 'border-red-500 bg-red-50/30' : 'border-zinc-100 bg-white'
                }`}
              >
                {isSelectMode ? (
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                      isSelected ? 'border-red-600 bg-red-600' : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isSelected ? <AppIcon name="check" size={14} color={colors.white} /> : null}
                  </View>
                ) : null}

                {item.image_uri ? (
                  <Image source={{ uri: item.image_uri }} className="h-[66px] w-[66px] rounded-[13px]" />
                ) : (
                  <View className="h-[66px] w-[66px] items-center justify-center rounded-[13px] bg-red-50">
                    <AppIcon name="image" size={24} color={colors.red200} />
                  </View>
                )}
                <View className="flex-1">
                  <Txt className="font-dm-bold" numberOfLines={1}>
                    {item.title}
                  </Txt>
                  <Txt className="my-0.5 text-[13px] font-dm-bold text-red-600">{formatRupiah(item.price)}</Txt>
                  {item.label ? (
                    <View className="self-start rounded bg-zinc-100 px-2 py-0.5">
                      <Txt className="text-[11px] font-dm-bold text-zinc-600">{item.label}</Txt>
                    </View>
                  ) : (
                    <Txt className={`text-xs ${item.is_active ? 'text-green-700' : 'text-zinc-400'}`}>
                      {item.is_active ? 'Aktif dijual' : 'Tidak aktif'}
                    </Txt>
                  )}
                </View>
                {!isSelectMode ? (
                  <Toggle
                    value={item.is_active}
                    onValueChange={(value) => setMenuActive(item.id, value)}
                    label={`${item.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${item.title}`}
                  />
                ) : null}
              </Pressable>
            );
          })}
          {filteredMenu.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-zinc-200 p-5">
              <Txt className="text-sm text-zinc-400">
                {activeLabelFilter !== 'Semua' ? 'Tidak ada menu dengan label ini.' : 'Belum ada menu. Tekan Tambah Baru.'}
              </Txt>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Modal Pilihan Tambah Baru */}
      <Modal transparent visible={sheetOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setSheetOpen(false)}>
        <View className="flex-1 justify-end bg-zinc-900/40">
          <Pressable className="flex-1" onPress={() => setSheetOpen(false)} accessibilityLabel="Tutup pilihan" />
          <View className="rounded-t-[28px] bg-gray-50 px-[22px] pb-8 pt-3.5">
            <View className="mb-6 h-[5px] w-[42px] self-center rounded bg-zinc-300" />
            <SectionTitle title="Apa yang ingin Anda tambahkan?" subtitle="Pilih salah satu untuk melanjutkan" />
            <View className="mt-5 gap-3">
              <SheetOption icon="user" title="+ Pelanggan Baru" hint="Simpan nama, nomor HP, dan alamat" onPress={() => go('CustomerForm')} />
              <SheetOption icon="book" title="+ Menu Makanan Baru" hint="Tambah foto, nama menu, dan harga" onPress={() => go('MenuForm')} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Pindahkan ke Label */}
      <Modal
        transparent
        visible={moveModalOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setMoveModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-zinc-900/40">
          <Pressable className="flex-1" onPress={() => setMoveModalOpen(false)} accessibilityLabel="Tutup" />
          <View className="max-h-[80%] rounded-t-[28px] bg-white px-5 pb-8 pt-4">
            <View className="mb-4 h-[5px] w-[42px] self-center rounded bg-zinc-300" />
            <Txt className="text-lg font-dm-bold">Pindahkan {selectedMenuIds.length} Menu</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">Pilih label tujuan untuk menu yang dipilih</Txt>

            {/* Input Buat Label Baru Inline */}
            <View className="mb-4 flex-row items-center gap-2">
              <Input
                value={newLabelInput}
                onChangeText={setNewLabelInput}
                placeholder="Buat label baru (mis. MIE)"
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm"
              />
              <Pressable
                onPress={handleCreateAndMove}
                className="h-11 items-center justify-center rounded-xl bg-red-600 px-4 active:bg-red-700"
              >
                <Txt className="text-xs font-dm-bold text-white">+ Pindah</Txt>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[300px]">
              <View className="gap-2">
                <Pressable
                  onPress={() => handleApplyMove(undefined)}
                  className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 active:bg-zinc-100"
                >
                  <Txt className="font-dm-semibold text-zinc-700">Hapus Label (Tanpa Label)</Txt>
                  <AppIcon name="chevron" size={16} color={colors.zinc400} />
                </Pressable>

                {labels.map((lbl) => (
                  <Pressable
                    key={lbl}
                    onPress={() => handleApplyMove(lbl)}
                    className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 active:bg-red-50"
                  >
                    <Txt className="font-dm-bold text-zinc-800">{lbl}</Txt>
                    <Txt className="text-xs text-red-600">Pilih label ini</Txt>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Kelola Label Toko */}
      <Modal
        transparent
        visible={manageLabelsModalOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setManageLabelsModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-zinc-900/40">
          <Pressable className="flex-1" onPress={() => setManageLabelsModalOpen(false)} accessibilityLabel="Tutup" />
          <View className="max-h-[85%] rounded-t-[28px] bg-white px-5 pb-8 pt-4">
            <View className="mb-4 h-[5px] w-[42px] self-center rounded bg-zinc-300" />
            <Txt className="text-lg font-dm-bold">Kelola Label Menu</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">
              Buat, ubah nama, atau hapus label kategori menu untuk tampilan poster.
            </Txt>

            {/* Input Tambah Label Baru */}
            <View className="mb-4 flex-row items-center gap-2">
              <Input
                value={newLabelInput}
                onChangeText={setNewLabelInput}
                placeholder="Nama label baru..."
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm"
              />
              <Pressable
                onPress={handleAddLabelFromManager}
                className="h-11 items-center justify-center rounded-xl bg-red-600 px-4 active:bg-red-700"
              >
                <Txt className="text-xs font-dm-bold text-white">+ Tambah</Txt>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[340px]">
              <View className="gap-2.5">
                {labels.map((lbl) => {
                  const count = menu.filter((m) => m.label?.trim() === lbl).length;
                  return (
                    <View
                      key={lbl}
                      className="min-h-[52px] flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2"
                    >
                      <View className="flex-1">
                        <Txt className="font-dm-bold text-[15px]">{lbl}</Txt>
                        <Txt className="text-xs text-zinc-400">{count} menu terhubung</Txt>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={() => {
                            setRenameOldLabel(lbl);
                            setRenameInput(lbl);
                          }}
                          className="h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 active:bg-zinc-200"
                        >
                          <AppIcon name="edit" size={14} color={colors.zinc700} />
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDeleteLabel(lbl)}
                          className="h-8 w-8 items-center justify-center rounded-lg bg-red-50 active:bg-red-100"
                        >
                          <AppIcon name="trash" size={14} color={colors.red600} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {labels.length === 0 ? (
                  <Txt className="py-6 text-center text-sm text-zinc-400">Belum ada label. Buat label baru di atas.</Txt>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Rename Label */}
      <Modal
        transparent
        visible={renameOldLabel !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRenameOldLabel(null)}
      >
        <View className="flex-1 items-center justify-center bg-zinc-900/40 px-5">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <Txt className="mb-1 text-lg font-dm-bold">Ubah Nama Label</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">
              Semua menu dengan label &quot;{renameOldLabel}&quot; akan otomatis diperbarui.
            </Txt>
            <Input
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Nama baru label"
              autoFocus
              className="mb-4 h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-base"
            />
            <View className="flex-row justify-end gap-2">
              <Pressable
                onPress={() => setRenameOldLabel(null)}
                className="min-h-[42px] items-center justify-center rounded-xl px-4 active:bg-zinc-100"
              >
                <Txt className="font-dm-semibold text-zinc-600">Batal</Txt>
              </Pressable>
              <Pressable
                onPress={handleSaveRename}
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
