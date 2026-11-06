import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppIcon, Screen, Txt } from '../components/ui';
import { useDrafts } from '../context/DraftContext';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { addDays, deliveryLabel, formatRupiah, longDate, shortDate, toISODate } from '../utils/format';

function StepTitle({ n, children, trailing }: { n: number; children: string; trailing?: string }) {
  return (
    <View className="mb-3.5 mt-6 flex-row items-center gap-2.5">
      <View className="h-[27px] w-[27px] items-center justify-center rounded-[9px] bg-red-100">
        <Txt className="text-sm font-dm-bold text-red-600">{n}</Txt>
      </View>
      <Txt className="flex-1 text-[17px] font-dm-bold">{children}</Txt>
      {trailing ? (
        <View className="rounded-[9px] bg-red-100 px-2.5 py-1">
          <Txt className="text-xs font-dm-bold text-red-600">{trailing}</Txt>
        </View>
      ) : null}
    </View>
  );
}

export function AddScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { allMenu, allCustomers, addOrders } = useStore();
  const { drafts, deliveryDate, setDeliveryDate, clearDrafts, draftTotal } = useDrafts();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = new Date();
  const quick = [
    { label: 'Hari Ini', iso: toISODate(today) },
    { label: 'Besok', iso: toISODate(addDays(today, 1)) },
    { label: 'Lusa', iso: toISODate(addDays(today, 2)) },
  ];
  const isCustomDate = !quick.some((q) => q.iso === deliveryDate);
  const total = drafts.reduce((sum, draft) => sum + draftTotal(draft, allMenu), 0);

  const save = () => {
    const created = addOrders(drafts, deliveryDate);
    if (created === 0) {
      Alert.alert('Pesanan kosong', 'Pilih pelanggan dan minimal satu menu pada setiap pesanan.');
      return;
    }
    clearDrafts();
    navigation.navigate('Main', { screen: 'Home' });
  };

  const footer = (
    <View className="mx-3 mb-3 flex-row items-center gap-2.5 rounded-[21px] border border-zinc-100 bg-white p-3.5" style={{ elevation: 8 }}>
      <View className="flex-1">
        <Txt className="text-xs text-zinc-500">Total Pesanan</Txt>
        <Txt className="mt-0.5 text-[17px] font-dm-bold">{formatRupiah(total)}</Txt>
      </View>
      <Pressable
        disabled={drafts.length === 0}
        onPress={save}
        className={`min-h-[55px] flex-row items-center gap-1 rounded-[15px] px-4 ${
          drafts.length === 0 ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
        }`}
      >
        <Txt className="font-dm-bold text-white">Simpan Pesanan</Txt>
        <AppIcon name="chevron" color={colors.white} />
      </Pressable>
    </View>
  );

  return (
    <Screen tabBar footer={footer}>
      <AppHeader title="Catat Pesanan" subtitle="Pesanan Baru" />

      <StepTitle n={1}>Pilih tanggal pesanan</StepTitle>
      <View className="flex-row gap-2">
        {quick.map((q) => {
          const selected = q.iso === deliveryDate;
          return (
            <Pressable
              key={q.iso}
              onPress={() => setDeliveryDate(q.iso)}
              className={`min-h-[66px] flex-1 items-center justify-center rounded-[14px] ${
                selected ? 'border-2 border-red-600 bg-red-50' : 'border border-zinc-200 bg-white'
              }`}
            >
              <Txt className={`font-dm-bold ${selected ? 'text-red-700' : 'text-zinc-600'}`}>{q.label}</Txt>
              <Txt className="mt-0.5 text-[11px] text-zinc-400">{shortDate(q.iso)}</Txt>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setCalendarOpen(true)}
          accessibilityLabel="Pilih tanggal lain"
          className={`min-h-[66px] w-[46px] items-center justify-center rounded-[14px] ${
            isCustomDate ? 'border-2 border-red-600 bg-red-50' : 'border border-zinc-200 bg-white'
          }`}
        >
          <AppIcon name="calendar" color={isCustomDate ? colors.red600 : colors.zinc600} />
        </Pressable>
      </View>
      {isCustomDate ? (
        <Txt className="mt-2 text-[13px] font-dm-semibold text-red-700">Tanggal dipilih: {longDate(deliveryDate)}</Txt>
      ) : null}

      <StepTitle n={2} trailing={drafts.length > 0 ? `${drafts.length} pesanan` : undefined}>
        Pelanggan & Detail Pesanan
      </StepTitle>

      {drafts.length > 0 ? (
        <View className="gap-3">
          {drafts.map((draft, index) => {
            const lines = Object.entries(draft.quantities).filter(([, qty]) => qty > 0);
            return (
              <Pressable
                key={draft.id}
                onPress={() => navigation.navigate('OrderEditor', { draftId: draft.id })}
                className="min-h-[136px] flex-row items-start gap-3 overflow-hidden rounded-[20px] border border-red-200 bg-white p-[18px] active:bg-red-50"
              >
                <View className="absolute inset-y-0 left-0 w-1 bg-red-600" />
                <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-red-100">
                  <Txt className="font-dm-bold text-red-600">{index + 1}</Txt>
                </View>
                <View className="flex-1 gap-2">
                  <Txt className="text-[19px] font-dm-bold" numberOfLines={1}>
                    {allCustomers[draft.customer_id]?.name ?? 'Pelanggan'}
                  </Txt>
                  <View className="gap-1">
                    {lines.map(([menuId, qty]) => (
                      <Txt key={menuId} className="text-sm text-zinc-600">
                        • {allMenu[menuId]?.title ?? 'Menu'} {qty}x
                      </Txt>
                    ))}
                  </View>
                  <View className="flex-row items-center gap-1.5 self-start rounded-[9px] bg-red-50 px-2.5 py-1.5">
                    <AppIcon name="clock" size={17} color={colors.red800} />
                    <Txt className="text-[13px] font-dm-bold text-red-800">{deliveryLabel(draft.slot, draft.time)}</Txt>
                  </View>
                  {draft.note ? <Txt className="text-[13px] leading-[18px] text-yellow-900">Catatan: {draft.note}</Txt> : null}
                </View>
                <View className="min-w-[42px] items-center gap-1">
                  <AppIcon name="edit" size={20} color={colors.red600} />
                  <Txt className="text-[11px] font-dm-bold text-red-600">Ubah</Txt>
                </View>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => navigation.navigate('OrderEditor')}
            className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl border border-red-500 bg-white active:bg-red-50"
          >
            <AppIcon name="plus" size={21} color={colors.red600} />
            <Txt className="text-[15px] font-dm-bold text-red-600">Add Another Order</Txt>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => navigation.navigate('OrderEditor')}
          className="min-h-[92px] flex-row items-center gap-3 rounded-[20px] border border-dashed border-red-500 bg-red-50/60 p-4 active:bg-red-50"
        >
          <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-red-600">
            <AppIcon name="plus" size={24} color={colors.white} />
          </View>
          <Txt className="flex-1 text-[15px] font-dm-bold text-red-600">Tambah Pelanggan & Detail Pesanan</Txt>
          <AppIcon name="chevron" size={20} color={colors.red600} />
        </Pressable>
      )}

      <Modal transparent visible={calendarOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setCalendarOpen(false)}>
        <View className="flex-1 justify-end bg-zinc-900/40">
          <Pressable className="flex-1" onPress={() => setCalendarOpen(false)} accessibilityLabel="Tutup" />
          <View className="max-h-[70%] rounded-t-[28px] bg-gray-50 px-[22px] pb-8 pt-3.5">
            <View className="mb-5 h-[5px] w-[42px] self-center rounded bg-zinc-300" />
            <Txt className="mb-3 text-xl font-dm-bold">Pilih tanggal</Txt>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {Array.from({ length: 30 }, (_, i) => toISODate(addDays(today, i))).map((iso) => {
                  const selected = iso === deliveryDate;
                  return (
                    <Pressable
                      key={iso}
                      onPress={() => {
                        setDeliveryDate(iso);
                        setCalendarOpen(false);
                      }}
                      className={`min-h-[52px] flex-row items-center justify-between rounded-xl border px-4 ${
                        selected ? 'border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <Txt className={`font-dm-semibold ${selected ? 'text-red-700' : ''}`}>{longDate(iso)}</Txt>
                      {selected ? <AppIcon name="check" size={18} color={colors.red600} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
