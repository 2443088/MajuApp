import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useDrafts } from '../context/DraftContext';
import { useStore } from '../context/StoreContext';
import { colors } from '../theme/colors';
import { displayPhone } from '../utils/format';
import { NameRecapModal } from './NameRecapModal';
import { AppIcon, Avatar, Input, Toggle, Txt } from './ui';

/**
 * Langkah 3: Mode Kurir. Memilih banyak pelanggan sekaligus tanpa mengisi menu.
 * Daftar centang disimpan di DraftContext, jadi TIDAK hilang ketika teks pencarian
 * diubah atau dihapus, maupun ketika pindah tab.
 */
export function CourierPicker() {
  const { customers, allCustomers } = useStore();
  const { courierMode, setCourierMode, courierIds, toggleCourier, addCourierIds, clearCourier } = useDrafts();
  const [query, setQuery] = useState('');
  const [recapOpen, setRecapOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address_text.toLowerCase().includes(q) ||
        c.whatsapp_number.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000'),
    );
  }, [customers, query]);

  const selected = courierIds.filter((id) => allCustomers[id]);
  const selectedSet = new Set(selected);
  const unselectedInView = filtered.filter((c) => !selectedSet.has(c.id));

  return (
    <View className="rounded-[20px] border border-zinc-100 bg-white p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-red-100">
          <AppIcon name="navigation" size={22} color={colors.red600} />
        </View>
        <View className="flex-1">
          <Txt className="text-[15px] font-dm-bold">Mode Kurir / Pengantaran</Txt>
          <Txt className="mt-0.5 text-xs leading-4 text-zinc-500">Catat daftar antar tanpa harus mengisi menu</Txt>
        </View>
        <Toggle value={courierMode} onValueChange={setCourierMode} label="Mode Kurir" />
      </View>

      {courierMode ? (
        <View className="mt-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Txt className="text-[13px] font-dm-bold text-zinc-600">Terpilih: {selected.length} pelanggan</Txt>
            {selected.length > 0 ? (
              <Pressable onPress={clearCourier} hitSlop={8}>
                <Txt className="text-[13px] font-dm-bold text-red-600">Kosongkan</Txt>
              </Pressable>
            ) : null}
          </View>

          {selected.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {selected.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => toggleCourier(id)}
                  accessibilityLabel={`Hapus ${allCustomers[id].name} dari daftar antar`}
                  className="min-h-[40px] flex-row items-center gap-1.5 rounded-full border border-red-200 bg-red-50 pl-3.5 pr-2.5"
                >
                  <Txt className="text-[13px] font-dm-bold text-red-700" numberOfLines={1}>
                    {allCustomers[id].name}
                  </Txt>
                  <AppIcon name="x" size={14} color={colors.red600} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Pressable
            onPress={() => setRecapOpen(true)}
            className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-red-500 bg-red-50/60 active:bg-red-50"
          >
            <AppIcon name="clipboard" size={18} color={colors.red600} />
            <Txt className="font-dm-bold text-red-600">Tempel Rekap Nama dari WA</Txt>
          </Pressable>

          <View className="h-[52px] flex-row items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5">
            <AppIcon name="search" size={19} color={colors.zinc400} />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Cari nama, alamat, atau nomor..."
              className="h-full flex-1 text-[15px]"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Hapus pencarian">
                <AppIcon name="x" size={18} color={colors.zinc400} />
              </Pressable>
            ) : null}
          </View>

          {query && unselectedInView.length > 0 ? (
            <Pressable onPress={() => addCourierIds(unselectedInView.map((c) => c.id))} hitSlop={6}>
              <Txt className="text-[13px] font-dm-bold text-red-600">Pilih semua {unselectedInView.length} hasil pencarian</Txt>
            </Pressable>
          ) : null}

          <View className="max-h-[340px] overflow-hidden rounded-xl border border-zinc-100">
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filtered.map((customer, index) => {
                const on = selectedSet.has(customer.id);
                return (
                  <Pressable
                    key={customer.id}
                    onPress={() => toggleCourier(customer.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    className={`min-h-[64px] flex-row items-center gap-3 px-3 py-2 ${
                      index > 0 ? 'border-t border-zinc-100' : ''
                    } ${on ? 'bg-red-50' : 'active:bg-zinc-50'}`}
                  >
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                        on ? 'border-red-600 bg-red-600' : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {on ? <AppIcon name="check" size={14} color={colors.white} /> : null}
                    </View>
                    <Avatar label={customer.name} size={38} />
                    <View className="flex-1">
                      <Txt className="font-dm-bold" numberOfLines={1}>
                        {customer.name}
                      </Txt>
                      <Txt className="text-xs text-zinc-500" numberOfLines={1}>
                        {customer.address_text || displayPhone(customer.whatsapp_number)}
                      </Txt>
                    </View>
                    {!customer.coordinates ? <AppIcon name="alert" size={15} color={colors.amber600} /> : null}
                  </Pressable>
                );
              })}
              {filtered.length === 0 ? (
                <View className="items-center p-5">
                  <Txt className="text-sm text-zinc-400">
                    {customers.length === 0 ? 'Belum ada pelanggan tersimpan' : 'Tidak ada pelanggan yang cocok'}
                  </Txt>
                </View>
              ) : null}
            </ScrollView>
          </View>
          <Txt className="text-[11px] leading-4 text-zinc-400">
            Ikon segitiga = pelanggan belum punya koordinat, jadi tidak ikut rute otomatis.
          </Txt>
        </View>
      ) : null}

      <NameRecapModal
        visible={recapOpen}
        onClose={() => setRecapOpen(false)}
        onApply={(ids) => {
          addCourierIds(ids);
          setRecapOpen(false);
        }}
      />
    </View>
  );
}
