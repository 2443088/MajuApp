import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Customer } from '../types';
import { displayPhone } from '../utils/format';
import { AppIcon, Avatar, Input, Txt } from './ui';

interface Props {
  customers: Customer[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddCustomer?: () => void;
}

export function CustomerDropdown({ customers, selectedId, onSelect, onAddCustomer }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = customers.find((c) => c.id === selectedId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.whatsapp_number.includes(q)) : customers;
  }, [customers, query]);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        className={`min-h-[76px] flex-row items-center gap-3 rounded-[17px] border bg-white px-3.5 py-2.5 ${
          open ? 'border-red-600' : 'border-zinc-200'
        }`}
      >
        <Avatar label={selected?.name ?? '?'} size={46} />
        <View className="flex-1 gap-0.5">
          <Txt className="text-base font-dm-bold" numberOfLines={1}>
            {selected?.name ?? 'Pilih pelanggan'}
          </Txt>
          <Txt className="text-[13px] text-zinc-500" numberOfLines={1}>
            {selected ? displayPhone(selected.whatsapp_number) : 'Ketuk untuk mencari pelanggan'}
          </Txt>
        </View>
        <AppIcon name={open ? 'chevron-down' : 'chevron'} size={20} color={colors.zinc400} />
      </Pressable>

      {open ? (
        <View className="mt-2 max-h-[300px] overflow-hidden rounded-[18px] border border-zinc-200 bg-white p-2">
          <View className="h-[54px] flex-row items-center gap-2 border-b border-zinc-100 px-2">
            <AppIcon name="search" size={20} color={colors.zinc400} />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Cari nama pelanggan..."
              className="h-[42px] flex-1 text-[15px]"
              autoFocus
            />
          </View>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" className="pt-1">
            {filtered.map((customer) => {
              const isSelected = customer.id === selectedId;
              return (
                <Pressable
                  key={customer.id}
                  onPress={() => {
                    onSelect(customer.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`min-h-[64px] flex-row items-center gap-2.5 rounded-[13px] p-2 ${
                    isSelected ? 'bg-red-50' : 'active:bg-zinc-50'
                  }`}
                >
                  <Avatar label={customer.name} size={44} />
                  <View className="flex-1 gap-0.5">
                    <Txt className="font-dm-bold" numberOfLines={1}>
                      {customer.name}
                    </Txt>
                    <Txt className="text-xs text-zinc-500">{displayPhone(customer.whatsapp_number)}</Txt>
                  </View>
                  {isSelected ? <AppIcon name="check" size={19} color={colors.red600} /> : null}
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <View className="items-center gap-2 rounded-2xl border border-dashed border-zinc-200 p-4">
                <Txt className="text-sm text-zinc-400">
                  {customers.length === 0 ? 'Belum ada pelanggan tersimpan' : 'Pelanggan tidak ditemukan'}
                </Txt>
                {onAddCustomer ? (
                  <Pressable onPress={onAddCustomer} className="rounded-xl bg-red-50 px-3 py-2">
                    <Txt className="text-[13px] font-dm-bold text-red-600">+ Pelanggan Baru</Txt>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
