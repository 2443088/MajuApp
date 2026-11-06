import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { AppIcon, Txt, type IconName } from './ui';

interface Props {
  title: string;
  subtitle?: string;
}

export function AppHeader({ title, subtitle }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leaveStore, syncEnabled } = useStore();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(90);
  const buttonRef = useRef<React.ElementRef<typeof View>>(null);

  const openMenu = () => {
    // Modal dipakai (bukan view absolut) agar tombol popover tetap bisa ditekan di Android.
    buttonRef.current?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      setTop(y + height + 8);
      setOpen(true);
    });
  };

  const confirmLeave = (heading: string) => {
    setOpen(false);
    const warning = syncEnabled
      ? 'Data toko tetap aman di cloud. Anda bisa masuk lagi dengan Kode Toko.'
      : 'Firebase belum aktif, jadi data hanya ada di HP ini. Pastikan sudah membuat cadangan sebelum keluar.';
    Alert.alert(heading, warning, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void leaveStore() },
    ]);
  };

  const items: { icon: IconName; title: string; hint: string; danger?: boolean; onPress: () => void }[] = [
    {
      icon: 'settings',
      title: 'Pengaturan Toko',
      hint: 'Profil, kode toko, cadangan data',
      onPress: () => {
        setOpen(false);
        navigation.navigate('Settings');
      },
    },
    {
      icon: 'switch',
      title: 'Switch Account / Store',
      hint: 'Masuk dengan kode toko lain',
      onPress: () => confirmLeave('Ganti toko?'),
    },
    {
      icon: 'logout',
      title: 'Logout',
      hint: 'Keluar dari akun ini',
      danger: true,
      onPress: () => confirmLeave('Keluar dari toko?'),
    },
  ];

  return (
    <View className="mb-6 mt-1.5 flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        {subtitle ? <Txt className="mb-0.5 text-sm font-dm-semibold text-zinc-500">{subtitle}</Txt> : null}
        <Txt className="text-[27px] font-dm-bold leading-8" numberOfLines={1}>
          {title}
        </Txt>
      </View>

      <View ref={buttonRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          accessibilityLabel="Pengaturan akun"
          className="h-[52px] w-[52px] items-center justify-center rounded-[17px] border border-zinc-200 bg-white active:bg-zinc-100"
        >
          <AppIcon name="settings" color={colors.zinc700} />
        </Pressable>
      </View>

      <Modal transparent visible={open} animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View
            className="absolute right-[22px] w-[275px] rounded-[18px] border border-zinc-200 bg-white p-[7px] shadow-xl"
            style={{ top, elevation: 12 }}
          >
            {items.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={item.onPress}
                className={`min-h-[62px] flex-row items-center gap-3 rounded-[13px] px-2.5 py-2 active:bg-zinc-100 ${
                  index > 0 ? 'border-t border-zinc-100' : ''
                }`}
              >
                <AppIcon name={item.icon} size={20} color={item.danger ? colors.red600 : colors.zinc700} />
                <View className="flex-1">
                  <Txt className={`text-sm font-dm-bold ${item.danger ? 'text-red-600' : 'text-zinc-700'}`}>
                    {item.title}
                  </Txt>
                  <Txt className="text-[11px] text-zinc-400">{item.hint}</Txt>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
