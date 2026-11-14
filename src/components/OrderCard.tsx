import React from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Order } from '../types';
import { formatRupiah, longDate, relativeDateLabel, shortDate } from '../utils/format';
import { AppIcon, Avatar, Txt, type IconName } from './ui';

interface Props {
  order: Order;
  customerName: string;
  hasLocation: boolean;
  onDone: () => void;
  onDelete: () => void;
  onShareCourier: () => void;
  onOpenMap: () => void;
  onTogglePaid: () => void;
  onToggleReady: () => void;
}

function dateText(iso: string): string {
  const relative = relativeDateLabel(iso);
  return ['Hari Ini', 'Besok', 'Lusa'].includes(relative) ? `${relative}, ${shortDate(iso)}` : longDate(iso);
}

function ActionChip({
  icon,
  label,
  onPress,
  active = false,
  activeTone = 'green',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeTone?: 'green' | 'amber';
}) {
  const activeStyle = activeTone === 'green' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50';
  const activeText = activeTone === 'green' ? 'text-green-700' : 'text-amber-700';
  const activeColor = activeTone === 'green' ? '#15803d' : '#b45309';
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[40px] flex-row items-center gap-1.5 rounded-xl border px-3 ${
        active ? activeStyle : 'border-zinc-200 bg-white active:bg-zinc-100'
      }`}
    >
      <AppIcon name={icon} size={16} color={active ? activeColor : colors.zinc600} />
      <Txt className={`text-[13px] font-dm-semibold ${active ? activeText : 'text-zinc-600'}`}>{label}</Txt>
    </Pressable>
  );
}

export function OrderCard({
  order,
  customerName,
  hasLocation,
  onDone,
  onDelete,
  onShareCourier,
  onOpenMap,
  onTogglePaid,
  onToggleReady,
}: Props) {
  const items = order.items.map((item) => `${item.quantity} ${item.title}`).join(' • ');
  const relative = relativeDateLabel(order.delivery_date);
  const ready = order.status === 'READY_FOR_DELIVERY';

  return (
    <View className="overflow-hidden rounded-[22px] border border-zinc-100 bg-white p-[18px]">
      <View className="absolute left-0 top-[21px] h-[45px] w-1 rounded-r bg-red-600" />

      <View className="flex-row items-center justify-between">
        <Txt className="text-[11px] font-dm-bold uppercase tracking-widest text-zinc-400">
          Pesanan #{order.id.slice(-4)}
        </Txt>
        <View className="flex-row items-center gap-2">
          {relative === 'Besok' || relative === 'Hari Ini' ? (
            <View className="rounded-lg bg-orange-50 px-2 py-1">
              <Txt className="text-[11px] font-dm-bold text-orange-700">{relative}</Txt>
            </View>
          ) : null}
          <Pressable
            onPress={onDelete}
            accessibilityLabel={`Hapus pesanan ${customerName}`}
            className="h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-red-50 active:bg-red-100"
          >
            <AppIcon name="trash" size={21} color={colors.red600} />
          </Pressable>
        </View>
      </View>

      <View className="mb-4 mt-2 flex-row items-center gap-3">
        <Avatar label={customerName} />
        <View className="flex-1">
          <Txt className="text-lg font-dm-bold" numberOfLines={1}>
            {customerName}
          </Txt>
          <Txt className="mt-0.5 text-[13px] text-zinc-500" numberOfLines={2}>
            {items}
          </Txt>
        </View>
      </View>

      <View className="mb-4 flex-row gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-[11px] border border-zinc-100 bg-zinc-50 px-2.5 py-2.5">
          <AppIcon name="calendar" size={19} color={colors.red600} />
          <Txt className="flex-1 text-[13px] text-zinc-600" numberOfLines={1}>
            {dateText(order.delivery_date)}
          </Txt>
        </View>
        {order.delivery_time ? (
          <View className="flex-row items-center gap-2 rounded-[11px] border border-red-200 bg-red-50 px-3 py-2.5">
            <AppIcon name="clock" size={19} color={colors.red600} />
            <Txt className="text-[13px] font-dm-bold text-red-800" numberOfLines={1}>
              {order.delivery_time}
            </Txt>
          </View>
        ) : null}
      </View>

      {order.note ? (
        <View className="mb-4 flex-row items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <Txt className="text-[13px] font-dm-bold text-yellow-900">Catatan:</Txt>
          <Txt className="flex-1 text-[13px] leading-5 text-yellow-900">{order.note}</Txt>
        </View>
      ) : null}

      <View className="mb-4 flex-row flex-wrap gap-2">
        <ActionChip icon="share" label="Kirim ke Kurir" onPress={onShareCourier} />
        {hasLocation ? <ActionChip icon="navigation" label="Peta" onPress={onOpenMap} /> : null}
        <ActionChip
          icon="box"
          label={ready ? 'Siap antar' : 'Tandai siap'}
          onPress={onToggleReady}
          active={ready}
          activeTone="amber"
        />
        <ActionChip icon="wallet" label={order.is_paid ? 'Lunas' : 'Belum bayar'} onPress={onTogglePaid} active={order.is_paid} />
      </View>

      <View className="flex-row items-center justify-between border-t border-dashed border-zinc-200 pt-4">
        <View>
          <Txt className="text-xs text-zinc-500">Total</Txt>
          <Txt className="mt-0.5 text-lg font-dm-bold">{formatRupiah(order.total_amount)}</Txt>
        </View>
        <Pressable
          onPress={onDone}
          className="min-h-[48px] flex-row items-center gap-2 rounded-[14px] bg-red-600 px-[18px] active:bg-red-700"
        >
          <AppIcon name="check" size={20} color={colors.white} />
          <Txt className="font-dm-bold text-white">Selesai</Txt>
        </Pressable>
      </View>
    </View>
  );
}
