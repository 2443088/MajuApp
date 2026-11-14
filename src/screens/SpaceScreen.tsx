import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppIcon, Screen, Txt, type IconName } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { CollectionName } from '../types';
import { daysAgo, daysLeft, RETENTION_DAYS } from '../utils/format';

type Tab = 'poster' | 'trash';

interface TrashEntry {
  key: string;
  collection: CollectionName;
  id: string;
  title: string;
  deletedAt: number;
  icon: IconName;
}

export function SpaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    posters, deletePoster,
    trashOrders, trashCustomers, trashMenu, allCustomers,
    restoreFromTrash, deletePermanently,
  } = useStore();

  const [tab, setTab] = useState<Tab>('poster');

  const shareSaved = async (uri: string) => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Tidak bisa berbagi', 'Fitur berbagi berkas tidak tersedia di perangkat ini.');
      return;
    }
    try {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Bagikan poster ke WhatsApp / Instagram' });
    } catch {
      Alert.alert('Gagal membagikan poster', 'Coba lagi.');
    }
  };

  const confirmDeletePoster = (id: string) =>
    Alert.alert('Hapus poster?', 'Poster ini dihapus dari HP.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => void deletePoster(id) },
    ]);

  const trash = useMemo<TrashEntry[]>(() => {
    const entries: TrashEntry[] = [
      ...trashOrders.map((o) => ({
        key: o.id,
        collection: 'orders' as const,
        id: o.id,
        title: `${o.kind === 'DELIVERY' ? 'Pengantaran' : `Pesanan #${o.id.slice(-4)}`} • ${allCustomers[o.customer_id]?.name ?? 'Pelanggan'}`,
        deletedAt: o.deleted_at ?? 0,
        icon: 'book' as const,
      })),
      ...trashCustomers.map((c) => ({
        key: c.id,
        collection: 'customers' as const,
        id: c.id,
        title: `Pelanggan • ${c.name}`,
        deletedAt: c.deleted_at ?? 0,
        icon: 'user' as const,
      })),
      ...trashMenu.map((m) => ({
        key: m.id,
        collection: 'menu_items' as const,
        id: m.id,
        title: `Menu • ${m.title}`,
        deletedAt: m.deleted_at ?? 0,
        icon: 'image' as const,
      })),
    ];
    return entries.sort((a, b) => b.deletedAt - a.deletedAt);
  }, [trashOrders, trashCustomers, trashMenu, allCustomers]);

  const confirmPurge = (entry: TrashEntry) =>
    Alert.alert('Hapus permanen?', `${entry.title} tidak bisa dipulihkan lagi.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus Permanen', style: 'destructive', onPress: () => deletePermanently(entry.collection, entry.id) },
    ]);

  return (
    <Screen tabBar>
      <AppHeader title="Space" subtitle="Arsip & Pemulihan" />

      <View className="flex-row items-start gap-3 rounded-[17px] border border-orange-200 bg-orange-50 p-3.5">
        <AppIcon name="clock" color="#9a3412" />
        <Txt className="flex-1 text-sm leading-[20px] text-orange-800">
          Item di halaman ini disimpan selama <Txt className="font-dm-bold text-orange-800">{RETENTION_DAYS} hari</Txt>{' '}
          sebelum dihapus permanen.
        </Txt>
      </View>

      <View className="my-[18px] flex-row rounded-[15px] bg-zinc-200/70 p-1">
        {([
          { id: 'poster', label: 'Poster Promo', icon: 'image' },
          { id: 'trash', label: 'Tempat Sampah', icon: 'trash' },
        ] as const).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            className={`min-h-[51px] flex-1 flex-row items-center justify-center gap-2 rounded-xl ${tab === item.id ? 'bg-white' : ''}`}
          >
            <AppIcon name={item.icon} size={20} color={tab === item.id ? colors.red600 : colors.zinc500} />
            <Txt className={`text-[13px] font-dm-semibold ${tab === item.id ? 'text-red-600' : 'text-zinc-500'}`}>
              {item.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {tab === 'poster' ? (
        <View className="gap-4">
          <Pressable
            onPress={() => navigation.navigate('PosterStudio')}
            className="min-h-[88px] flex-row items-center gap-3 rounded-[20px] border border-dashed border-red-500 bg-red-50/60 p-4 active:bg-red-50"
          >
            <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-red-600">
              <AppIcon name="plus" size={24} color={colors.white} />
            </View>
            <View className="flex-1">
              <Txt className="text-[15px] font-dm-bold text-red-600">Buat Poster Baru</Txt>
              <Txt className="mt-0.5 text-xs text-zinc-500">Story 9:16 atau Feed 3:4, sampai 4 foto, atau daftar menu</Txt>
            </View>
            <AppIcon name="chevron" size={20} color={colors.red600} />
          </Pressable>

          {posters.length > 0 ? (
            <View className="gap-2.5">
              <Txt className="text-lg font-dm-bold">Poster tersimpan</Txt>
              {posters.map((poster) => (
                <View key={poster.id} className="flex-row items-center gap-3 rounded-[18px] border border-zinc-100 bg-white p-3">
                  <Image
                    source={{ uri: poster.uri }}
                    className="rounded-xl bg-red-100"
                    style={{ width: poster.ratio === '9:16' ? 50 : 62, height: 88 }}
                    resizeMode="cover"
                  />
                  <View className="flex-1">
                    <Txt className="font-dm-bold" numberOfLines={1}>
                      {poster.title}
                    </Txt>
                    <Txt className="mt-0.5 text-xs text-zinc-500">{poster.ratio === '9:16' ? 'Story 9:16' : 'Feed 3:4'}</Txt>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <AppIcon name="clock" size={14} color="#a16207" />
                      <Txt className="text-xs text-yellow-700">Tersimpan {daysLeft(poster.created_at)} hari lagi</Txt>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void shareSaved(poster.uri)}
                    accessibilityLabel="Bagikan ulang"
                    className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
                  >
                    <AppIcon name="share" size={18} color={colors.red600} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeletePoster(poster.id)}
                    accessibilityLabel="Hapus poster"
                    className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-zinc-100 active:bg-zinc-200"
                  >
                    <AppIcon name="trash" size={18} color={colors.zinc600} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Txt className="py-4 text-center text-sm text-zinc-400">Belum ada poster tersimpan.</Txt>
          )}
        </View>
      ) : (
        <View className="gap-3">
          <View>
            <Txt className="text-xl font-dm-bold">Baru Dihapus</Txt>
            <Txt className="mt-0.5 text-sm text-zinc-500">{trash.length} item dapat dipulihkan</Txt>
          </View>
          {trash.length > 0 ? (
            trash.map((entry) => (
              <View key={entry.key} className="gap-2.5 rounded-[19px] border border-zinc-100 bg-white p-3.5">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-zinc-100">
                    <AppIcon name={entry.icon} color={colors.zinc500} />
                  </View>
                  <View className="flex-1">
                    <Txt className="font-dm-bold" numberOfLines={2}>
                      {entry.title}
                    </Txt>
                    <Txt className="my-0.5 text-[13px] text-zinc-500">
                      {daysAgo(entry.deletedAt) === 0 ? 'Dihapus hari ini' : `Dihapus ${daysAgo(entry.deletedAt)} hari lalu`}
                    </Txt>
                    <Txt className="text-xs text-red-600">Hilang dalam {daysLeft(entry.deletedAt)} hari</Txt>
                  </View>
                </View>
                <View className="flex-row gap-2 border-t border-zinc-100 pt-3">
                  <Pressable
                    onPress={() => restoreFromTrash(entry.collection, entry.id)}
                    className="min-h-[43px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-green-50 active:bg-green-100"
                  >
                    <AppIcon name="rotate" size={17} color="#166534" />
                    <Txt className="font-dm-bold text-green-800">Pulihkan</Txt>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmPurge(entry)}
                    accessibilityLabel={`Hapus permanen ${entry.title}`}
                    className="min-h-[43px] w-[45px] items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
                  >
                    <AppIcon name="trash" size={18} color={colors.red600} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center gap-2 py-11">
              <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-green-100">
                <AppIcon name="check" color={colors.green600} />
              </View>
              <Txt className="text-[19px] font-dm-bold text-zinc-800">Space sudah bersih</Txt>
              <Txt className="text-zinc-500">Tidak ada item yang menunggu dihapus.</Txt>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
