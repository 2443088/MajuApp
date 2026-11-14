import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppIcon, Screen, SectionTitle, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import { colors } from '../theme/colors';
import type { Order } from '../types';
import { addDays, dayShort, formatNumber, formatRupiah, fromISODate, monthName, toISODate } from '../utils/format';

type Period = 'week' | 'month';

interface Range {
  start: string;
  end: string;
}

function currentRange(period: Period, today: Date): Range {
  if (period === 'week') {
    const start = addDays(today, -((today.getDay() + 6) % 7));
    return { start: toISODate(start), end: toISODate(addDays(start, 6)) };
  }
  return {
    start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1, 12)),
    end: toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0, 12)),
  };
}

function previousRange(period: Period, today: Date): Range {
  if (period === 'week') {
    const start = addDays(today, -((today.getDay() + 6) % 7) - 7);
    return { start: toISODate(start), end: toISODate(addDays(start, 6)) };
  }
  return {
    start: toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1, 12)),
    end: toISODate(new Date(today.getFullYear(), today.getMonth(), 0, 12)),
  };
}

const inRange = (order: Order, range: Range) => order.delivery_date >= range.start && order.delivery_date <= range.end;
const sum = (orders: Order[]) => orders.reduce((total, o) => total + o.total_amount, 0);

export function HistoryScreen() {
  const { orders, allCustomers } = useStore();
  const [period, setPeriod] = useState<Period>('week');

  const stats = useMemo(() => {
    const today = new Date();
    const completed = orders.filter((o) => o.status === 'COMPLETED' && o.kind !== 'DELIVERY');
    const range = currentRange(period, today);
    const current = completed.filter((o) => inRange(o, range));
    const previous = completed.filter((o) => inRange(o, previousRange(period, today)));
    const monthRange = currentRange('month', today);

    const revenue = sum(current);
    const prevRevenue = sum(previous);
    const delta = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

    const portions: Record<string, number> = {};
    const visits: Record<string, number> = {};
    current.forEach((order) => {
      order.items.forEach((item) => {
        portions[item.title] = (portions[item.title] ?? 0) + item.quantity;
      });
      visits[order.customer_id] = (visits[order.customer_id] ?? 0) + 1;
    });
    const topMenu = Object.entries(portions).sort((a, b) => b[1] - a[1])[0];
    const topCustomer = Object.entries(visits).sort((a, b) => b[1] - a[1])[0];

    let bars: { label: string; value: number }[];
    if (period === 'week') {
      const start = fromISODate(range.start);
      bars = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const iso = toISODate(day);
        return { label: dayShort(day), value: sum(current.filter((o) => o.delivery_date === iso)) };
      });
    } else {
      bars = Array.from({ length: 5 }, (_, i) => ({
        label: `M${i + 1}`,
        value: sum(current.filter((o) => Math.ceil(fromISODate(o.delivery_date).getDate() / 7) === i + 1)),
      }));
    }

    return {
      revenue,
      delta,
      topMenu,
      topCustomer,
      bars,
      monthName: monthName(today),
      monthCompleted: completed.filter((o) => inRange(o, monthRange)).length,
    };
  }, [orders, period]);

  const maxBar = Math.max(1, ...stats.bars.map((b) => b.value));
  const peakIndex = stats.bars.findIndex((b) => b.value === maxBar && b.value > 0);

  return (
    <Screen tabBar>
      <AppHeader title="Riwayat Penjualan" subtitle="Ringkasan Usaha" />

      <View className="mb-4 flex-row gap-2">
        {(['week', 'month'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setPeriod(value)}
            className={`min-h-[47px] flex-1 items-center justify-center rounded-[13px] border ${
              period === value ? 'border-red-600 bg-red-600' : 'border-zinc-200 bg-white'
            }`}
          >
            <Txt className={`${period === value ? 'font-dm-bold text-white' : 'text-zinc-500'}`}>
              {value === 'week' ? 'Minggu ini' : 'Bulan ini'}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View className="overflow-hidden rounded-[23px] bg-red-700 p-[21px]">
        <Txt className="absolute -bottom-8 -right-1 text-[100px] text-white/10" style={{ fontFamily: 'serif' }}>
          福
        </Txt>
        <View className="h-[43px] w-[43px] items-center justify-center rounded-[13px] bg-white/15">
          <AppIcon name="wallet" color={colors.white} />
        </View>
        <Txt className="mt-3 text-white/75">Total Pendapatan</Txt>
        <Txt className="my-1 text-[29px] font-dm-bold text-white">{formatRupiah(stats.revenue)}</Txt>
        <Txt className="text-[13px] text-white/80">
          {stats.delta === null ? (
            'Dari pesanan yang sudah selesai'
          ) : (
            <>
              <Txt className="font-dm-bold text-red-200">
                {stats.delta >= 0 ? '↑' : '↓'} {Math.abs(stats.delta)}%
              </Txt>{' '}
              dari {period === 'week' ? 'minggu' : 'bulan'} lalu
            </>
          )}
        </Txt>
      </View>

      <View className="my-3 flex-row gap-3">
        <View className="flex-1 rounded-[19px] border border-zinc-100 bg-white p-[15px]">
          <View className="mb-3 h-[43px] w-[43px] items-center justify-center rounded-[13px] bg-orange-50">
            <AppIcon name="star" color={colors.amber600} />
          </View>
          <Txt className="text-xs text-zinc-500">Menu Terlaris</Txt>
          <Txt className="my-1 text-[17px] font-dm-bold" numberOfLines={1}>
            {stats.topMenu?.[0] ?? '-'}
          </Txt>
          <Txt className="text-xs text-zinc-400">{stats.topMenu ? `${formatNumber(stats.topMenu[1])} porsi terjual` : 'Belum ada data'}</Txt>
        </View>
        <View className="flex-1 rounded-[19px] border border-zinc-100 bg-white p-[15px]">
          <View className="mb-3 h-[43px] w-[43px] items-center justify-center rounded-[13px] bg-red-50">
            <AppIcon name="heart" color={colors.red600} />
          </View>
          <Txt className="text-xs text-zinc-500">Pelanggan Setia</Txt>
          <Txt className="my-1 text-[17px] font-dm-bold" numberOfLines={1}>
            {stats.topCustomer ? (allCustomers[stats.topCustomer[0]]?.name ?? 'Pelanggan dihapus') : '-'}
          </Txt>
          <Txt className="text-xs text-zinc-400">{stats.topCustomer ? `${stats.topCustomer[1]} kali pesan` : 'Belum ada data'}</Txt>
        </View>
      </View>

      <View className="rounded-[21px] border border-zinc-100 bg-white p-[18px]">
        <SectionTitle
          title={period === 'week' ? 'Pendapatan Harian' : 'Pendapatan Mingguan'}
          subtitle="Dalam ribuan rupiah"
        />
        <View className="mt-3 h-[180px] flex-row items-end justify-between gap-2 pt-6">
          {stats.bars.map((bar, index) => {
            const heightPct = bar.value > 0 ? Math.max(8, (bar.value / maxBar) * 100) : 0;
            return (
              <View key={bar.label} className="h-full flex-1 items-center justify-end gap-2">
                {index === peakIndex ? (
                  <Txt className="text-[10px] font-dm-bold text-red-600">{formatNumber(bar.value / 1000)}</Txt>
                ) : null}
                <View className="w-full flex-1 items-center justify-end">
                  <View
                    className={`w-full max-w-[24px] rounded-t-[7px] rounded-b-[3px] ${index === peakIndex ? 'bg-red-600' : 'bg-red-200'}`}
                    style={{ height: `${heightPct}%`, minHeight: 6 }}
                  />
                </View>
                <Txt className="text-[11px] text-zinc-400">{bar.label}</Txt>
              </View>
            );
          })}
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-3 rounded-2xl bg-green-50 p-[15px]">
        <AppIcon name="check" color="#166534" />
        <Txt className="flex-1 text-[13px] text-green-800">
          <Txt className="font-dm-bold text-green-800">{stats.monthCompleted} pesanan</Txt> telah selesai bulan{' '}
          {stats.monthName}
        </Txt>
      </View>
    </Screen>
  );
}
