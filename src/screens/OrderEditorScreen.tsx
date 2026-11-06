import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { CustomerDropdown } from '../components/CustomerDropdown';
import { AppIcon, BackHeader, Input, Screen, Txt } from '../components/ui';
import { useDrafts } from '../context/DraftContext';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { DeliverySlot, DraftOrder } from '../types';
import { formatRupiah, isValidTime, makeId, maskTime } from '../utils/format';

const SLOT_DEFAULT: Record<DeliverySlot, string> = { Pagi: '07:00', Siang: '12:00' };

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
  const { customers, menu, allMenu } = useStore();
  const { drafts, upsertDraft, removeDraft, draftTotal } = useDrafts();

  const editing = drafts.find((d) => d.id === route.params?.draftId);
  const [draftId] = useState(() => editing?.id ?? makeId('DRAFT'));
  const [customerId, setCustomerId] = useState(editing?.customer_id ?? '');
  const [quantities, setQuantities] = useState<Record<string, number>>(editing?.quantities ?? {});
  const [slot, setSlot] = useState<DeliverySlot>(editing?.slot ?? 'Pagi');
  const [times, setTimes] = useState<Record<DeliverySlot, string>>({
    Pagi: editing?.slot === 'Pagi' ? editing.time : SLOT_DEFAULT.Pagi,
    Siang: editing?.slot === 'Siang' ? editing.time : SLOT_DEFAULT.Siang,
  });
  const [note, setNote] = useState(editing?.note ?? '');
  const [menuQuery, setMenuQuery] = useState('');

  const visibleMenu = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    // Menu yang sudah ada di draf tetap tampil walau kini dinonaktifkan, agar bisa diubah.
    return menu
      .filter((m) => m.is_active || (quantities[m.id] ?? 0) > 0)
      .filter((m) => !q || m.title.toLowerCase().includes(q));
  }, [menu, menuQuery, quantities]);

  const itemCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const current: DraftOrder = { id: draftId, customer_id: customerId, quantities, slot, time: times[slot], note };
  const total = draftTotal(current, allMenu);
  const timeValid = isValidTime(times[slot]);
  const canSave = Boolean(customerId) && total > 0 && timeValid;

  const adjust = (id: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  const save = () => {
    if (!timeValid) {
      Alert.alert('Jam tidak valid', 'Tulis jam dengan format 24 jam, contoh 07:00 atau 12:30.');
      return;
    }
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
        <Txt className="text-xs text-zinc-500">Total sementara</Txt>
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

      <SectionLabel title="Pilih Pelanggan" badge={customerId ? 'Terpilih' : 'Wajib diisi'} />
      <CustomerDropdown
        customers={customers}
        selectedId={customerId}
        onSelect={setCustomerId}
        onAddCustomer={() => navigation.navigate('CustomerForm')}
      />

      <SectionLabel title="Pilih Menu" badge={`${itemCount} item`} />
      <View className="mb-3 h-14 flex-row items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4">
        <AppIcon name="search" size={21} color={colors.zinc400} />
        <Input value={menuQuery} onChangeText={setMenuQuery} placeholder="Cari menu makanan..." className="flex-1 text-base" />
      </View>
      <View className="gap-2.5">
        {visibleMenu.map((item) => (
          <View key={item.id} className="flex-row items-center gap-3 rounded-[17px] border border-zinc-100 bg-white p-2.5">
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
              <Txt className="mt-1 text-[13px] font-dm-bold text-red-600">{formatRupiah(item.price)}</Txt>
            </View>
            <View className="flex-row items-center gap-2.5">
              <Pressable
                onPress={() => adjust(item.id, -1)}
                accessibilityLabel={`Kurangi ${item.title}`}
                className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-zinc-100 active:bg-zinc-200"
              >
                <AppIcon name="minus" size={18} color={colors.zinc600} />
              </Pressable>
              <Txt className="min-w-[18px] text-center font-dm-bold">{quantities[item.id] ?? 0}</Txt>
              <Pressable
                onPress={() => adjust(item.id, 1)}
                accessibilityLabel={`Tambah ${item.title}`}
                className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-red-600 active:bg-red-700"
              >
                <AppIcon name="plus" size={18} color={colors.white} />
              </Pressable>
            </View>
          </View>
        ))}
        {visibleMenu.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-zinc-200 p-4">
            <Txt className="text-sm text-zinc-400">{menu.length === 0 ? 'Belum ada menu aktif' : 'Menu tidak ditemukan'}</Txt>
            {menu.length === 0 ? (
              <Pressable onPress={() => navigation.navigate('MenuForm')} className="rounded-xl bg-red-50 px-3 py-2">
                <Txt className="text-[13px] font-dm-bold text-red-600">+ Menu Baru</Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <SectionLabel title="Catatan Pesanan" badge="Opsional" />
      <Txt className="-mt-1 mb-3 text-sm leading-5 text-zinc-500">Pilih waktu pesanan harus sampai ke pelanggan.</Txt>
      <View className="gap-2.5">
        {(['Pagi', 'Siang'] as const).map((option) => {
          const selected = slot === option;
          return (
            <Pressable
              key={option}
              onPress={() => setSlot(option)}
              className={`min-h-[64px] flex-row items-center gap-2.5 rounded-2xl px-3 py-2 ${
                selected ? 'border-2 border-red-600 bg-red-50' : 'border border-zinc-200 bg-white'
              }`}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-red-600' : 'border-zinc-300'
                }`}
              >
                {selected ? <View className="h-2.5 w-2.5 rounded-full bg-red-600" /> : null}
              </View>
              <Txt className={`flex-1 text-[15px] font-dm-bold ${selected ? 'text-red-800' : 'text-zinc-700'}`}>
                Harus {option}
              </Txt>
              <Input
                value={times[option]}
                onFocus={() => setSlot(option)}
                onChangeText={(text) => {
                  setSlot(option);
                  setTimes((prev) => ({ ...prev, [option]: maskTime(text) }));
                }}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="07:00"
                accessibilityLabel={`Jam pengiriman ${option.toLowerCase()}`}
                className={`h-11 w-[96px] rounded-[11px] border bg-white px-2 text-center text-[15px] font-dm-bold ${
                  selected && !timeValid ? 'border-red-500 text-red-700' : selected ? 'border-red-300 text-red-800' : 'border-zinc-300'
                }`}
              />
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3.5 gap-2">
        <Txt className="text-[15px] font-dm-bold">Catatan Tambahan</Txt>
        <View>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Contoh: sambal dipisah, tanpa bawang..."
            multiline
            maxLength={180}
            textAlignVertical="top"
            className="min-h-[96px] rounded-2xl border border-zinc-200 bg-white px-3.5 pb-7 pt-3 text-base leading-[22px]"
          />
          <Txt className="absolute bottom-2 right-3.5 text-[11px] font-dm-semibold text-zinc-400">{note.length}/180</Txt>
        </View>
      </View>

      {editing ? (
        <Pressable onPress={confirmRemove} className="mt-6 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 active:bg-red-100">
          <AppIcon name="trash" size={18} color={colors.red600} />
          <Txt className="font-dm-bold text-red-600">Hapus draf pesanan ini</Txt>
        </Pressable>
      ) : null}
    </Screen>
  );
}
