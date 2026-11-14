import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { CustomerDropdown } from '../components/CustomerDropdown';
import { ImportChatModal, type ImportResult } from '../components/ImportChatModal';
import { AppIcon, BackHeader, Input, Screen, Txt } from '../components/ui';
import { useDrafts } from '../context/DraftContext';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { DraftOrder } from '../types';
import { formatRupiah, makeId, pad2 } from '../utils/format';

function SectionLabel({ title, badge }: { title: string; badge: string }) {
  return (
    <View className="mb-2.5 mt-6 flex-row items-center justify-between">
      <Txt className="text-lg font-dm-bold">{title}</Txt>
      <View className="rounded-[9px] bg-red-100 px-2.5 py-1">
        <Txt className="text-xs font-dm-bold text-red-600">{badge}</Txt>
      </View>
    </View>
  );
}

export function OrderEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderEditor'>>();
  const { customers, menu, allMenu, labels } = useStore();
  const { drafts, upsertDraft, removeDraft, draftTotal } = useDrafts();

  const editing = drafts.find((d) => d.id === route.params?.draftId);
  const [draftId] = useState(() => editing?.id ?? makeId('DRAFT'));
  const [customerId, setCustomerId] = useState(editing?.customer_id ?? '');
  const [quantities, setQuantities] = useState<Record<string, number>>(editing?.quantities ?? {});
  const [timeOn, setTimeOn] = useState(editing?.timeOn ?? false);
  const [time, setTime] = useState(editing?.time || '07:00');
  const [timeNote, setTimeNote] = useState(editing?.timeNote ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [menuQuery, setMenuQuery] = useState('');
  const [activeLabel, setActiveLabel] = useState<string>('Semua');
  const [noteExpanded, setNoteExpanded] = useState(Boolean(editing?.note));
  const [importOpen, setImportOpen] = useState(route.params?.openImport === true);
  const [importedName, setImportedName] = useState('');

  // Semua menu yang layak tampil (aktif atau sudah dipilih di draf)
  const availableMenu = useMemo(
    () => menu.filter((m) => m.is_active || (quantities[m.id] ?? 0) > 0),
    [menu, quantities],
  );

  // Filter berdasarkan label & kata kunci pencarian
  const visibleMenu = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return availableMenu
      .filter((m) => {
        if (activeLabel === '__NO_LABEL__') return !m.label || !m.label.trim();
        if (activeLabel !== 'Semua') return m.label?.trim() === activeLabel;
        return true;
      })
      .filter((m) => !q || m.title.toLowerCase().includes(q));
  }, [availableMenu, activeLabel, menuQuery]);

  // Daftar menu yang sudah dipilih (qty > 0) untuk ringkasan cepat
  const selectedItems = useMemo(
    () => availableMenu.filter((m) => (quantities[m.id] ?? 0) > 0),
    [availableMenu, quantities],
  );

  const hasUnlabeledMenu = useMemo(
    () => availableMenu.some((m) => !m.label || !m.label.trim()),
    [availableMenu],
  );

  const itemCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const current: DraftOrder = { id: draftId, customer_id: customerId, quantities, timeOn, time, timeNote, note };
  const total = draftTotal(current, allMenu);
  const canSave = Boolean(customerId) && total > 0;

  const applyImport = (result: ImportResult) => {
    if (result.customerId) setCustomerId(result.customerId);
    setImportedName(result.customerId ? '' : result.customerName);
    setQuantities((prev) => {
      const next = { ...prev };
      Object.entries(result.quantities).forEach(([id, qty]) => {
        next[id] = (next[id] ?? 0) + qty;
      });
      return next;
    });
    setImportOpen(false);
  };

  const adjust = (id: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  const openTimePicker = () => {
    const [hour, minute] = time.split(':').map(Number);
    const initial = new Date();
    initial.setHours(hour || 0, minute || 0, 0, 0);
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'time',
      is24Hour: true,
      onChange: (event, selected) => {
        if (event.type !== 'set' || !selected) return;
        setTime(`${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`);
        setTimeOn(true);
      },
    });
  };

  const onTimePress = () => {
    if (timeOn) setTimeOn(false);
    else openTimePicker();
  };

  const save = () => {
    const cleaned = Object.fromEntries(Object.entries(quantities).filter(([, qty]) => qty > 0));
    upsertDraft({ ...current, quantities: cleaned });
    navigation.goBack();
  };

  const confirmRemove = () =>
    Alert.alert('Hapus draf pesanan ini?', 'Draf belum tersimpan sebagai pesanan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          removeDraft(draftId);
          navigation.goBack();
        },
      },
    ]);

  const footer = (
    <View className="flex-row items-center gap-3 border-t border-zinc-100 bg-white px-[22px] py-3.5">
      <View className="flex-1">
        <Txt className="text-xs text-zinc-500">
          Total sementara {itemCount > 0 ? `(${itemCount} item)` : ''}
        </Txt>
        <Txt className="mt-0.5 text-lg font-dm-bold">{formatRupiah(total)}</Txt>
      </View>
      <Pressable
        onPress={save}
        disabled={!canSave}
        className={`min-h-[56px] min-w-[116px] flex-row items-center justify-center gap-2 rounded-2xl ${
          canSave ? 'bg-red-600 active:bg-red-700' : 'bg-zinc-300'
        }`}
      >
        <AppIcon name="check" size={20} color={colors.white} />
        <Txt className="text-base font-dm-bold text-white">Catat</Txt>
      </Pressable>
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackHeader
        title="Pelanggan & Menu"
        subtitle={editing ? 'Ubah Pesanan' : 'Pesanan Baru'}
        onBack={() => navigation.goBack()}
      />

      <Pressable
        onPress={() => setImportOpen(true)}
        className="mt-1 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl border border-red-500 bg-white active:bg-red-50"
      >
        <AppIcon name="clipboard" size={19} color={colors.red600} />
        <Txt className="text-[15px] font-dm-bold text-red-600">Import Chat WA</Txt>
      </Pressable>

      {/* 1. PILIH PELANGGAN */}
      <SectionLabel title="Pilih Pelanggan" badge={customerId ? 'Terpilih' : 'Wajib diisi'} />
      <CustomerDropdown
        customers={customers}
        selectedId={customerId}
        onSelect={setCustomerId}
        onAddCustomer={() => navigation.navigate('CustomerForm', { prefillName: importedName || undefined })}
      />
      {importedName && !customerId ? (
        <Pressable
          onPress={() => navigation.navigate('CustomerForm', { prefillName: importedName })}
          className="mt-2 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 active:bg-amber-100"
        >
          <AppIcon name="plus" size={17} color={colors.amber600} />
          <Txt className="flex-shrink text-[13px] font-dm-bold text-yellow-900" numberOfLines={1}>
            Tambah “{importedName}” sebagai pelanggan baru
          </Txt>
        </Pressable>
      ) : null}

      {/* 2. WAKTU & CATATAN PESANAN (Diletakkan di atas daftar menu agar tidak tertutup 100+ item) */}
      <SectionLabel title="Waktu & Catatan" badge={timeOn || note.trim() ? 'Terisi' : 'Opsional'} />
      <View className="rounded-2xl border border-zinc-200 bg-white p-2.5">
        <View className="flex-row items-center gap-2">
          <Input
            value={timeNote}
            onChangeText={(text) => {
              setTimeNote(text);
              if (!timeOn && text.length > 0) setTimeOn(true);
            }}
            placeholder="Keterangan waktu (mis. Harus pagi)..."
            maxLength={40}
            className={`h-11 flex-1 pl-1.5 text-[15px] ${timeOn ? '' : 'text-zinc-400'}`}
          />
          <Pressable
            onPress={onTimePress}
            accessibilityRole="switch"
            accessibilityState={{ checked: timeOn }}
            accessibilityLabel={
              timeOn
                ? `Catatan waktu aktif, jam ${time}. Ketuk untuk menonaktifkan`
                : 'Catatan waktu nonaktif. Ketuk untuk mengaktifkan dan memilih jam'
            }
            className={`h-11 min-w-[98px] flex-row items-center justify-center gap-1.5 rounded-xl px-3 ${
              timeOn ? 'bg-red-600 active:bg-red-700' : 'bg-zinc-100 active:bg-zinc-200'
            }`}
          >
            <AppIcon name="clock" size={16} color={timeOn ? colors.white : colors.zinc400} />
            <Txt className={`text-[15px] font-dm-bold ${timeOn ? 'text-white' : 'text-zinc-400'}`}>{time}</Txt>
          </Pressable>
        </View>

        {/* Catatan Tambahan yang ringkas (expandable) */}
        <View className="mt-2 border-t border-zinc-100 pt-2">
          {noteExpanded || note.length > 0 ? (
            <View>
              <Input
                value={note}
                onChangeText={setNote}
                placeholder="Catatan makanan (mis. sambal dipisah, tanpa bawang)..."
                multiline
                maxLength={180}
                textAlignVertical="top"
                className="min-h-[72px] rounded-xl bg-zinc-50 px-3 pb-6 pt-2.5 text-[15px] leading-5"
              />
              <Txt className="absolute bottom-1.5 right-3 text-[11px] font-dm-semibold text-zinc-400">
                {note.length}/180
              </Txt>
            </View>
          ) : (
            <Pressable
              onPress={() => setNoteExpanded(true)}
              className="flex-row items-center gap-1.5 py-1 pl-1 active:opacity-70"
            >
              <AppIcon name="edit" size={14} color={colors.zinc500} />
              <Txt className="text-[13px] font-dm-semibold text-zinc-500">
                + Tambah catatan makanan (opsional)
              </Txt>
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. PILIH MENU + FILTER LABEL HORIZONTAL */}
      <SectionLabel title="Pilih Menu" badge={`${itemCount} item`} />

      {/* Ringkasan item terpilih (jika ada) agar mudah dicek/dikurangi tanpa mencari lagi */}
      {selectedItems.length > 0 ? (
        <View className="mb-3 rounded-2xl border border-red-200 bg-red-50/70 p-2.5">
          <Txt className="mb-1.5 px-1 text-xs font-dm-bold text-red-700">
            Sudah dipilih ({selectedItems.length} jenis):
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {selectedItems.map((item) => (
              <View
                key={`sel-${item.id}`}
                className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-white px-2.5 py-1.5"
              >
                <Txt className="max-w-[140px] text-xs font-dm-bold text-zinc-800" numberOfLines={1}>
                  {item.title}
                </Txt>
                <View className="flex-row items-center gap-1.5">
                  <Pressable
                    onPress={() => adjust(item.id, -1)}
                    hitSlop={6}
                    className="h-6 w-6 items-center justify-center rounded-md bg-zinc-100"
                  >
                    <AppIcon name="minus" size={13} color={colors.zinc700} />
                  </Pressable>
                  <Txt className="min-w-[14px] text-center text-xs font-dm-bold text-red-600">
                    {quantities[item.id]}
                  </Txt>
                  <Pressable
                    onPress={() => adjust(item.id, 1)}
                    hitSlop={6}
                    className="h-6 w-6 items-center justify-center rounded-md bg-red-600"
                  >
                    <AppIcon name="plus" size={13} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Kotak Pencarian Menu */}
      <View className="mb-2.5 h-13 flex-row items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4">
        <AppIcon name="search" size={20} color={colors.zinc400} />
        <Input
          value={menuQuery}
          onChangeText={setMenuQuery}
          placeholder="Cari nama menu..."
          className="flex-1 py-3 text-base"
        />
        {menuQuery.length > 0 ? (
          <Pressable onPress={() => setMenuQuery('')} hitSlop={8}>
            <AppIcon name="x" size={17} color={colors.zinc400} />
          </Pressable>
        ) : null}
      </View>

      {/* Tab Scroll Horizontal Label Makanan */}
      {labels.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
        >
          <Pressable
            onPress={() => setActiveLabel('Semua')}
            className={`min-h-[36px] items-center justify-center rounded-full border px-3.5 ${
              activeLabel === 'Semua' ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
            }`}
          >
            <Txt className={`text-xs font-dm-bold ${activeLabel === 'Semua' ? 'text-white' : 'text-zinc-600'}`}>
              Semua ({availableMenu.length})
            </Txt>
          </Pressable>

          {labels.map((lbl) => {
            const count = availableMenu.filter((m) => m.label?.trim() === lbl).length;
            if (count === 0) return null;
            const selected = activeLabel === lbl;
            return (
              <Pressable
                key={lbl}
                onPress={() => setActiveLabel(lbl)}
                className={`min-h-[36px] items-center justify-center rounded-full border px-3.5 ${
                  selected ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
                }`}
              >
                <Txt className={`text-xs font-dm-bold ${selected ? 'text-white' : 'text-zinc-600'}`}>
                  {lbl} ({count})
                </Txt>
              </Pressable>
            );
          })}

          {hasUnlabeledMenu ? (
            <Pressable
              onPress={() => setActiveLabel('__NO_LABEL__')}
              className={`min-h-[36px] items-center justify-center rounded-full border px-3.5 ${
                activeLabel === '__NO_LABEL__' ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
              }`}
            >
              <Txt
                className={`text-xs font-dm-bold ${
                  activeLabel === '__NO_LABEL__' ? 'text-white' : 'text-zinc-600'
                }`}
              >
                Lainnya ({availableMenu.filter((m) => !m.label || !m.label.trim()).length})
              </Txt>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      {/* Daftar Menu */}
      <View className="gap-2.5">
        {visibleMenu.map((item) => {
          const qty = quantities[item.id] ?? 0;
          return (
            <View
              key={item.id}
              className={`flex-row items-center gap-3 rounded-[17px] border p-2.5 ${
                qty > 0 ? 'border-red-300 bg-red-50/30' : 'border-zinc-100 bg-white'
              }`}
            >
              {item.image_uri ? (
                <Image source={{ uri: item.image_uri }} className="h-[57px] w-[57px] rounded-xl" />
              ) : (
                <View className="h-[57px] w-[57px] items-center justify-center rounded-xl bg-red-50">
                  <AppIcon name="image" size={22} color={colors.red200} />
                </View>
              )}
              <View className="flex-1">
                <Txt className="text-[15px] font-dm-bold" numberOfLines={1}>
                  {item.title}
                </Txt>
                <View className="mt-1 flex-row items-center gap-2">
                  <Txt className="text-[13px] font-dm-bold text-red-600">{formatRupiah(item.price)}</Txt>
                  {item.label ? (
                    <View className="rounded bg-zinc-100 px-1.5 py-0.5">
                      <Txt className="text-[10px] font-dm-bold text-zinc-500">{item.label}</Txt>
                    </View>
                  ) : null}
                </View>
              </View>
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  onPress={() => adjust(item.id, -1)}
                  accessibilityLabel={`Kurangi ${item.title}`}
                  className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-zinc-100 active:bg-zinc-200"
                >
                  <AppIcon name="minus" size={18} color={colors.zinc600} />
                </Pressable>
                <Txt className="min-w-[18px] text-center font-dm-bold">{qty}</Txt>
                <Pressable
                  onPress={() => adjust(item.id, 1)}
                  accessibilityLabel={`Tambah ${item.title}`}
                  className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-red-600 active:bg-red-700"
                >
                  <AppIcon name="plus" size={18} color={colors.white} />
                </Pressable>
              </View>
            </View>
          );
        })}

        {visibleMenu.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-zinc-200 p-4">
            <Txt className="text-sm text-zinc-400">
              {menu.length === 0 ? 'Belum ada menu aktif' : 'Menu tidak ditemukan di kategori ini'}
            </Txt>
            {menu.length === 0 ? (
              <Pressable onPress={() => navigation.navigate('MenuForm')} className="rounded-xl bg-red-50 px-3 py-2">
                <Txt className="text-[13px] font-dm-bold text-red-600">+ Menu Baru</Txt>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setActiveLabel('Semua');
                  setMenuQuery('');
                }}
                className="rounded-xl bg-zinc-100 px-3 py-1.5"
              >
                <Txt className="text-xs font-dm-bold text-zinc-700">Reset Filter</Txt>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>

      {editing ? (
        <Pressable
          onPress={confirmRemove}
          className="mt-6 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 active:bg-red-100"
        >
          <AppIcon name="trash" size={18} color={colors.red600} />
          <Txt className="font-dm-bold text-red-600">Hapus draf pesanan ini</Txt>
        </Pressable>
      ) : null}
      <ImportChatModal visible={importOpen} onClose={() => setImportOpen(false)} onApply={applyImport} />
    </Screen>
  );
}