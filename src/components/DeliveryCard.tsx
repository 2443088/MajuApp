import React from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Customer, Order } from '../types';
import { AppIcon, Txt, type IconName } from './ui';

export interface DeliveryRow {
  order: Order;
  customer?: Customer;
  hasLocation: boolean;
}

interface Props {
  dateLabel: string;
  rows: DeliveryRow[];
  /** Semua titik sudah Done: kartu menampilkan indikator selesai sebelum dibersihkan. */
  finished: boolean;
  canRoute: boolean;
  onToggleDone: (order: Order) => void;
  onWhatsApp: (order: Order) => void;
  onOpenMap: (order: Order) => void;
  onDelete: (order: Order) => void;
  onRoute: () => void;
  onUndoFinish: () => void;
}

function ActionButton({
  icon,
  label,
  onPress,
  tone,
  disabled = false,
  accessibilityLabel,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone: 'green' | 'red' | 'done' | 'undone';
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const styles = {
    green: { box: 'border-green-200 bg-green-50', icon: '#15803d', text: 'text-green-700' },
    red: { box: 'border-red-200 bg-red-50', icon: colors.red600, text: 'text-red-600' },
    undone: { box: 'border-zinc-300 bg-white', icon: colors.zinc500, text: 'text-zinc-500' },
    done: { box: 'border-green-600 bg-green-600', icon: colors.white, text: 'text-green-700' },
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={3}
      className={`h-[50px] w-[46px] items-center justify-center gap-0.5 rounded-xl border ${styles.box} ${
        disabled ? 'opacity-40' : 'active:opacity-70'
      }`}
    >
      <AppIcon name={icon} size={19} color={styles.icon} />
      <Txt className={`text-[10px] font-dm-bold ${styles.text}`}>{label}</Txt>
    </Pressable>
  );
}

export function DeliveryCard({
  dateLabel,
  rows,
  finished,
  canRoute,
  onToggleDone,
  onWhatsApp,
  onOpenMap,
  onDelete,
  onRoute,
  onUndoFinish,
}: Props) {
  const doneCount = rows.filter((r) => r.order.status === 'COMPLETED').length;
  const progress = rows.length === 0 ? 0 : doneCount / rows.length;

  if (finished) {
    return (
      <View className="overflow-hidden rounded-[22px] border border-green-200 bg-green-50 p-[18px]">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-green-600">
            <AppIcon name="check" size={26} color={colors.white} />
          </View>
          <View className="flex-1">
            <Txt className="text-[17px] font-dm-bold text-green-800">Semua pengantaran selesai</Txt>
            <Txt className="mt-0.5 text-[13px] text-green-700">
              {dateLabel} · {rows.length} titik terkirim
            </Txt>
          </View>
          <Pressable
            onPress={onUndoFinish}
            className="min-h-[44px] justify-center rounded-xl border border-green-300 bg-white px-3.5 active:bg-green-100"
          >
            <Txt className="text-[13px] font-dm-bold text-green-800">Urungkan</Txt>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[22px] border border-zinc-100 bg-white p-[18px]">
      <View className="absolute left-0 top-[21px] h-[45px] w-1 rounded-r bg-red-600" />

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Txt className="text-[11px] font-dm-bold uppercase tracking-widest text-zinc-400">Pengantaran</Txt>
          <Txt className="mt-0.5 text-lg font-dm-bold" numberOfLines={1}>
            {dateLabel}
          </Txt>
        </View>
        <View className="rounded-lg bg-red-100 px-2.5 py-1.5">
          <Txt className="text-xs font-dm-bold text-red-700">
            {doneCount}/{rows.length} selesai
          </Txt>
        </View>
      </View>

      <View className="mb-1 mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <View className="h-full rounded-full bg-green-500" style={{ width: `${Math.round(progress * 100)}%` }} />
      </View>

      <View className="mt-1">
        {rows.map((row, index) => {
          const done = row.order.status === 'COMPLETED';
          const name = row.customer?.name ?? 'Pelanggan dihapus';
          return (
            <View
              key={row.order.id}
              className={`flex-row items-center gap-2 py-2.5 ${index > 0 ? 'border-t border-zinc-100' : ''}`}
            >
              <Pressable
                onLongPress={() => onDelete(row.order)}
                delayLongPress={500}
                className="min-w-0 flex-1 flex-row items-center gap-2"
              >
                <View className={`h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Txt className={`text-[11px] font-dm-bold ${done ? 'text-green-700' : 'text-red-600'}`}>{index + 1}</Txt>
                </View>
                <View className="min-w-0 flex-1">
                  <Txt
                    className={`text-[15px] font-dm-bold ${done ? 'text-zinc-400 line-through' : ''}`}
                    numberOfLines={2}
                  >
                    {name}
                  </Txt>
                  {row.customer?.address_text ? (
                    <Txt className="text-[11px] text-zinc-400" numberOfLines={1}>
                      {row.customer.address_text}
                    </Txt>
                  ) : null}
                </View>
              </Pressable>

              <View className="flex-row gap-1.5">
                <ActionButton
                  icon="message"
                  label="WA"
                  tone="green"
                  disabled={!row.customer?.whatsapp_number}
                  onPress={() => onWhatsApp(row.order)}
                  accessibilityLabel={`Chat WhatsApp ${name}`}
                />
                <ActionButton
                  icon="map"
                  label="Peta"
                  tone="red"
                  disabled={!row.hasLocation}
                  onPress={() => onOpenMap(row.order)}
                  accessibilityLabel={`Buka peta ${name}`}
                />
                <ActionButton
                  icon={done ? 'check-square' : 'square'}
                  label="Done"
                  tone={done ? 'done' : 'undone'}
                  onPress={() => onToggleDone(row.order)}
                  accessibilityLabel={`${done ? 'Batalkan selesai' : 'Tandai selesai'} ${name}`}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View className="mt-2 flex-row items-center justify-between border-t border-dashed border-zinc-200 pt-3">
        <Txt className="flex-1 pr-2 text-[11px] leading-4 text-zinc-400">Tahan nama untuk menghapus dari daftar</Txt>
        {canRoute ? (
          <Pressable
            onPress={onRoute}
            className="min-h-[44px] flex-row items-center gap-1.5 rounded-xl bg-red-600 px-3.5 active:bg-red-700"
          >
            <AppIcon name="navigation" size={16} color={colors.white} />
            <Txt className="text-[13px] font-dm-bold text-white">Rute</Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
