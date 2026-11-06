import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, Txt, type IconName } from '../components/ui';
import { colors } from '../theme/colors';

const TABS: Record<string, { label: string; icon: IconName }> = {
  Home: { label: 'Home', icon: 'home' },
  Menu: { label: 'Menu', icon: 'book' },
  Add: { label: 'Tambah', icon: 'plus' },
  History: { label: 'Riwayat', icon: 'chart' },
  Space: { label: 'Space', icon: 'box' },
};

/**
 * Tombol tengah menonjol ke atas. Seluruh tombol berada di dalam bounds container
 * (bukan margin negatif) karena Android mengabaikan sentuhan di luar bounds induk.
 */
export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingBottom: insets.bottom }} className="bg-white">
      <View className="h-[98px]">
        <View className="absolute inset-x-0 bottom-0 top-7 border-t border-zinc-100 bg-white" style={{ elevation: 8 }} />
        <View className="flex-1 flex-row px-3">
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const tab = TABS[route.name];
            const isAdd = route.name === 'Add';
            const tint = focused || isAdd ? colors.red600 : colors.zinc400;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
                className="min-w-0 flex-1 items-center justify-end gap-1 pb-3"
              >
                {isAdd ? (
                  <View
                    className="h-[62px] w-[62px] items-center justify-center rounded-full border-[5px] border-white bg-red-600"
                    style={{ elevation: 6 }}
                  >
                    <AppIcon name={tab.icon} size={30} color={colors.white} />
                  </View>
                ) : (
                  <View className="h-[33px] items-center justify-center">
                    <AppIcon name={tab.icon} size={24} color={tint} />
                  </View>
                )}
                <Txt className="text-[11px] font-dm-semibold" style={{ color: tint }}>
                  {tab.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
