import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Share, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { DeliveryCard, type DeliveryRow } from '../components/DeliveryCard';
import { OrderCard } from '../components/OrderCard';
import { AppIcon, Screen, SectionTitle, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { buildCourierText } from '../services/courierFormat';
import {
  buildRouteBatches,
  buildSearchUrl,
  buildSingleStopUrl,
  nearestNeighborOrder,
  type RouteBatch,
} from '../services/routeCalculator';
import { colors } from '../theme/colors';
import type { Customer, Order } from '../types';
import { addDays, greeting, longDate, relativeDateLabel, shortDate, toISODate, toIntlPhone } from '../utils/format';

type Filter = 'Semua' | 'Hari Ini' | 'Besok' | 'Lusa';
const FILTERS: Filter[] = ['Semua', 'Hari Ini', 'Besok', 'Lusa'];

function matchesFilter(order: Order, filter: Filter): boolean {
  if (filter === 'Semua') return true;
  const offset = filter === 'Hari Ini' ? 0 : filter === 'Besok' ? 1 : 2;
  return order.delivery_date === toISODate(addDays(new Date(), offset));
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Tidak bisa membuka Google Maps', 'Pastikan aplikasi Google Maps atau browser tersedia.');
  }
}

function customerMapUrl(customer?: Customer): string | null {
  if (!customer) return null;
  if (customer.coordinates) return buildSingleStopUrl(customer.coordinates);
  if (customer.maps_url) return customer.maps_url;
  if (customer.address_text) return buildSearchUrl(customer.address_text);
  return null;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    session, profile, orders, allCustomers, online, syncEnabled, activeDevices,
    setOrderStatus, toggleOrderPaid, moveToTrash,
  } = useStore();

  const [filter, setFilter] = useState<Filter>('Semua');
  const [filterOpen, setFilterOpen] = useState(false);
  const [batches, setBatches] = useState<RouteBatch<string>[] | null>(null);
  // Kartu pengantaran yang baru selesai tetap tampil sebentar dengan indikator "selesai".
  const [lingering, setLingering] = useState<Record<string, true>>({});
  const lingerTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastToggled = useRef<Record<string, string>>({});

  useEffect(
    () => () => {
      Object.values(lingerTimers.current).forEach(clearTimeout);
    },
    [],
  );

  const storeName = profile?.store_name ?? session?.store_name ?? 'Toko Mama';

  const active = useMemo(
    () => orders.filter((o) => o.status !== 'COMPLETED' && matchesFilter(o, filter)),
    [orders, filter],
  );

  const regularActive = useMemo(() => active.filter((o) => o.kind !== 'DELIVERY'), [active]);

  const deliveryGroups = useMemo(() => {
    const byDate = new Map<string, Order[]>();
    orders
      .filter((o) => o.kind === 'DELIVERY' && matchesFilter(o, filter))
      .forEach((o) => byDate.set(o.delivery_date, [...(byDate.get(o.delivery_date) ?? []), o]));
    return Array.from(byDate.entries())
      .filter(([date, list]) => lingering[date] || list.some((o) => o.status !== 'COMPLETED'))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [orders, filter, lingering]);

  const buildRows = (list: Order[]): DeliveryRow[] => {
    const origin = profile?.origin_coordinates;
    const entries = list.map((order) => ({ order, customer: allCustomers[order.customer_id] }));
    const byName = (a: (typeof entries)[number], b: (typeof entries)[number]) =>
      (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '');
    const located = entries.filter((e) => e.customer?.coordinates);
    const rest = entries.filter((e) => !e.customer?.coordinates).sort(byName);
    // Urutan antar: terdekat dari rumah (Nearest Neighbor). Tanpa titik rumah: urut nama.
    const ordered = origin
      ? nearestNeighborOrder(
          origin,
          located.map((e) => ({ coordinates: e.customer!.coordinates!, payload: e })),
        ).map((stop) => stop.payload)
      : located.sort(byName);
    return [...ordered, ...rest].map((e) => ({
      order: e.order,
      customer: e.customer,
      hasLocation: customerMapUrl(e.customer) !== null,
    }));
  };

  const clearLinger = (date: string) => {
    clearTimeout(lingerTimers.current[date]);
    delete lingerTimers.current[date];
    setLingering((prev) => {
      const { [date]: _gone, ...rest } = prev;
      return rest;
    });
  };

  const startLinger = (date: string) => {
    clearTimeout(lingerTimers.current[date]);
    setLingering((prev) => ({ ...prev, [date]: true }));
    lingerTimers.current[date] = setTimeout(() => clearLinger(date), 3500);
  };

  const toggleDelivery = (order: Order, group: Order[]) => {
    const wasDone = order.status === 'COMPLETED';
    setOrderStatus(order.id, wasDone ? 'PENDING' : 'COMPLETED');
    lastToggled.current[order.delivery_date] = order.id;
    if (wasDone) clearLinger(order.delivery_date);
    else if (group.every((o) => o.id === order.id || o.status === 'COMPLETED')) startLinger(order.delivery_date);
  };

  const undoFinish = (date: string, group: Order[]) => {
    const id = lastToggled.current[date] ?? group[group.length - 1]?.id;
    if (id) setOrderStatus(id, 'PENDING');
    clearLinger(date);
  };

  const openWhatsApp = (order: Order) => {
    const customer = allCustomers[order.customer_id];
    const phone = toIntlPhone(customer?.whatsapp_number ?? '');
    if (!phone) {
      Alert.alert('Nomor belum ada', 'Pelanggan ini belum punya nomor WhatsApp.');
      return;
    }
    const message = `Halo ${customer?.name ?? ''}, pesanan dari ${storeName} sedang diantar ya.`;
    void openUrl(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  };

  const confirmDeleteDelivery = (order: Order) => {
    const name = allCustomers[order.customer_id]?.name ?? 'pelanggan ini';
    Alert.alert('Hapus dari daftar antar?', `${name} dipindah ke Space dan bisa dipulihkan selama 7 hari.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => moveToTrash('orders', order.id) },
    ]);
  };

  const status = !syncEnabled
    ? { dot: 'bg-zinc-400', text: 'Mode lokal' }
    : online
      ? { dot: 'bg-green-500', text: `${Math.max(1, activeDevices)} perangkat aktif` }
      : { dot: 'bg-amber-500', text: 'Offline' };

  const shareCourier = (order: Order) => {
    const text = buildCourierText(order, allCustomers[order.customer_id], storeName);
    Share.share({ message: text }).catch(() => undefined);
  };

  const confirmDelete = (order: Order, name: string) => {
    Alert.alert('Hapus pesanan?', `Pesanan ${name} dipindah ke Space dan bisa dipulihkan selama 7 hari.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => moveToTrash('orders', order.id) },
    ]);
  };

  const planRoute = (list: Order[] = active) => {
    const origin = profile?.origin_coordinates;
    if (!origin) {
      Alert.alert(
        'Lokasi rumah belum diatur',
        'Rute dimulai dari rumah Mama. Isi tautan Google Maps rumah di Pengaturan Toko.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: () => navigation.navigate('Settings') },
        ],
      );
      return;
    }
    const seen = new Set<string>();
    const stops: { coordinates: NonNullable<Customer['coordinates']>; payload: string }[] = [];
    list.forEach((order) => {
      const customer = allCustomers[order.customer_id];
      if (customer?.coordinates && !seen.has(customer.id)) {
        seen.add(customer.id);
        stops.push({ coordinates: customer.coordinates, payload: customer.name });
      }
    });
    if (stops.length === 0) {
      Alert.alert(
        'Belum ada titik antar',
        'Pelanggan pada pesanan ini belum punya koordinat. Tempel link Google Maps di data pelanggan.',
      );
      return;
    }
    const built = buildRouteBatches(origin, stops);
    if (built.length === 1) void openUrl(built[0].url);
    else setBatches(built);
  };

  const routeCount = new Set(
    active.map((o) => allCustomers[o.customer_id]).filter((c): c is Customer => Boolean(c?.coordinates)).map((c) => c.id),
  ).size;

  return (
    <Screen tabBar>
      <AppHeader title="Toko Mama" subtitle={`${greeting()}, Mama`} />

      <View className="mb-7 flex-row items-center gap-3 rounded-[20px] border border-red-200 bg-red-50 p-4">
        <View
          className="h-[49px] w-[49px] items-center justify-center rounded-[15px] bg-red-600"
          style={{ transform: [{ rotate: '-2deg' }] }}
        >
          <Txt className="font-script text-[21px] text-white">MJ</Txt>
        </View>
        <View className="flex-1">
          <Txt className="mb-0.5 text-base font-dm-bold" numberOfLines={1}>
            {storeName}
          </Txt>
          <Txt className="text-[13px] text-zinc-500">
            Kode Toko: <Txt className="font-dm-bold tracking-wide text-red-700">{session?.store_key}</Txt>
          </Txt>
        </View>
        <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white px-2.5 py-1.5">
          <View className={`h-[7px] w-[7px] rounded-full ${status.dot}`} />
          <Txt className="text-[10px] font-dm-bold text-green-800">{status.text}</Txt>
        </View>
      </View>

      <View className="mb-4 flex-row items-center justify-between">
        <SectionTitle title="Pesanan Aktif" subtitle={`${active.length} pesanan akan datang`} />
        <Pressable
          onPress={() => setFilterOpen((v) => !v)}
          className="flex-row items-center gap-2 rounded-[13px] border border-zinc-100 bg-white px-3 py-2.5 active:bg-zinc-100"
        >
          <AppIcon name="calendar" size={18} color={colors.zinc600} />
          <Txt className="text-[13px] text-zinc-600">{filter}</Txt>
          <AppIcon name={filterOpen ? 'chevron-down' : 'chevron'} size={15} color={colors.zinc600} />
        </Pressable>
      </View>

      {filterOpen ? (
        <View className="mb-4 flex-row gap-2">
          {FILTERS.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setFilter(item);
                setFilterOpen(false);
              }}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border ${
                item === filter ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'
              }`}
            >
              <Txt className={`text-[13px] font-dm-semibold ${item === filter ? 'text-red-600' : 'text-zinc-600'}`}>
                {item}
              </Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      {routeCount > 0 ? (
        <Pressable
          onPress={() => planRoute()}
          className="mb-4 min-h-[58px] flex-row items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 active:bg-red-50"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-600">
            <AppIcon name="navigation" size={20} color={colors.white} />
          </View>
          <View className="flex-1">
            <Txt className="font-dm-bold">Rute Antar Otomatis</Txt>
            <Txt className="text-xs text-zinc-500">{routeCount} titik, diurutkan dari yang terdekat</Txt>
          </View>
          <AppIcon name="chevron" size={20} color={colors.zinc400} />
        </Pressable>
      ) : null}

      {regularActive.length > 0 || deliveryGroups.length > 0 ? (
        <View className="gap-4">
          {deliveryGroups.map(([date, list]) => {
            const rows = buildRows(list);
            const relative = relativeDateLabel(date);
            const dateLabel = ['Hari Ini', 'Besok', 'Lusa'].includes(relative)
              ? `${relative}, ${shortDate(date)}`
              : longDate(date);
            const remaining = list.filter((o) => o.status !== 'COMPLETED');
            return (
              <DeliveryCard
                key={`delivery-${date}`}
                dateLabel={dateLabel}
                rows={rows}
                finished={list.every((o) => o.status === 'COMPLETED')}
                canRoute={remaining.some((o) => allCustomers[o.customer_id]?.coordinates)}
                onToggleDone={(order) => toggleDelivery(order, list)}
                onWhatsApp={openWhatsApp}
                onOpenMap={(order) => {
                  const url = customerMapUrl(allCustomers[order.customer_id]);
                  if (url) void openUrl(url);
                }}
                onDelete={confirmDeleteDelivery}
                onRoute={() => planRoute(remaining)}
                onUndoFinish={() => undoFinish(date, list)}
              />
            );
          })}
          {regularActive.map((order) => {
            const customer = allCustomers[order.customer_id];
            return (
              <OrderCard
                key={order.id}
                order={order}
                customerName={customer?.name ?? 'Pelanggan dihapus'}
                hasLocation={customerMapUrl(customer) !== null}
                onDone={() => setOrderStatus(order.id, 'COMPLETED')}
                onDelete={() => confirmDelete(order, customer?.name ?? 'ini')}
                onShareCourier={() => shareCourier(order)}
                onOpenMap={() => {
                  const url = customerMapUrl(customer);
                  if (url) void openUrl(url);
                }}
                onTogglePaid={() => toggleOrderPaid(order.id)}
                onToggleReady={() =>
                  setOrderStatus(order.id, order.status === 'READY_FOR_DELIVERY' ? 'PENDING' : 'READY_FOR_DELIVERY')
                }
              />
            );
          })}
        </View>
      ) : (
        <View className="items-center px-2.5 py-8">
          <View
            className="mb-5 h-[84px] w-[84px] items-center justify-center rounded-[28px] bg-red-100"
            style={{ transform: [{ rotate: '-4deg' }] }}
          >
            <AppIcon name="book" size={40} color={colors.red600} />
          </View>
          <Txt className="text-[22px] font-dm-bold">
            {filter === 'Semua' ? 'Belum ada pesanan' : `${filter} masih tenang`}
          </Txt>
          <Txt className="mb-6 mt-2.5 text-center leading-6 text-zinc-500">
            Belum ada pesanan aktif{filter === 'Semua' ? '' : ` untuk ${filter.toLowerCase()}`}. Catat pesanan baru
            sekarang atau cek Riwayat Penjualan.
          </Txt>
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Add' })}
            className="min-h-[56px] w-full flex-row items-center justify-center gap-2 rounded-2xl bg-red-600 active:bg-red-700"
          >
            <AppIcon name="plus" color={colors.white} />
            <Txt className="text-base font-dm-bold text-white">Catat Pesanan Baru</Txt>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'History' })}
            className="mt-2.5 min-h-[56px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white active:bg-zinc-100"
          >
            <Txt className="text-base font-dm-bold">Lihat Riwayat</Txt>
          </Pressable>
        </View>
      )}

      <Modal
        transparent
        visible={batches !== null}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setBatches(null)}
      >
        <View className="flex-1 justify-end bg-zinc-900/40">
          <Pressable className="flex-1" onPress={() => setBatches(null)} accessibilityLabel="Tutup" />
          <View className="max-h-[75%] rounded-t-[28px] bg-gray-50 px-[22px] pb-8 pt-3.5">
            <View className="mb-5 h-[5px] w-[42px] self-center rounded bg-zinc-300" />
            <SectionTitle
              title="Pilih Rute"
              subtitle="Google Maps maksimal 10 titik per rute, jadi pengantaran dipecah beberapa bagian."
            />
            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <View className="gap-3">
                {batches?.map((batch) => (
                  <View key={batch.index} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <Txt className="font-dm-bold">
                      Rute {batch.index} dari {batch.total} · {batch.stops.length} titik
                    </Txt>
                    <Txt className="mt-1.5 text-[13px] leading-5 text-zinc-500">
                      {batch.stops.map((stop, i) => `${i + 1}. ${stop.payload}`).join('\n')}
                    </Txt>
                    <Pressable
                      onPress={() => void openUrl(batch.url)}
                      className="mt-3 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl bg-red-600 active:bg-red-700"
                    >
                      <AppIcon name="navigation" size={18} color={colors.white} />
                      <Txt className="font-dm-bold text-white">Buka di Google Maps</Txt>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
