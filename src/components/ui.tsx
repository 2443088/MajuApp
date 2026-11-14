import Feather from '@expo/vector-icons/Feather';
import React, { forwardRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { initialOf } from '../utils/format';

// ------------------------------------------------------------------ teks & input
const HAS_FONT = /(^|\s)font-/;
const HAS_COLOR = /(^|\s)text-(white|black|zinc|red|green|amber|gray|orange|yellow|\[#)/;

function withDefaults(className: string, color: string): string {
  return `${HAS_FONT.test(className) ? '' : 'font-dm '}${HAS_COLOR.test(className) ? '' : `${color} `}${className}`;
}

/** Text dengan font DM Sans dan warna default; className dari pemanggil menang. */
export function Txt({ className = '', ...props }: TextProps) {
  return <Text {...props} className={withDefaults(className, 'text-zinc-900')} />;
}

export const Input = forwardRef<React.ElementRef<typeof TextInput>, TextInputProps>(function Input({ className = '', ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.zinc400}
      {...props}
      className={withDefaults(className, 'text-zinc-800')}
    />
  );
});

// ------------------------------------------------------------------ ikon
export type IconName =
  | 'home' | 'book' | 'plus' | 'chart' | 'box' | 'trash' | 'calendar' | 'clock' | 'check'
  | 'search' | 'map' | 'user' | 'phone' | 'chevron' | 'chevron-down' | 'image' | 'rotate'
  | 'wallet' | 'star' | 'heart' | 'minus' | 'edit' | 'arrow-left' | 'settings' | 'logout'
  | 'switch' | 'share' | 'copy' | 'navigation' | 'qr' | 'x' | 'cloud' | 'cloud-off' | 'download' | 'alert'
  | 'tag' | 'folder' | 'message' | 'square' | 'check-square' | 'clipboard' | 'zap' | 'users';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const ICONS: Record<IconName, FeatherName> = {
  home: 'home',
  book: 'book-open',
  plus: 'plus',
  chart: 'bar-chart-2',
  box: 'archive',
  trash: 'trash-2',
  calendar: 'calendar',
  clock: 'clock',
  check: 'check',
  search: 'search',
  map: 'map-pin',
  user: 'user',
  phone: 'phone',
  chevron: 'chevron-right',
  'chevron-down': 'chevron-down',
  image: 'image',
  rotate: 'rotate-ccw',
  wallet: 'credit-card',
  star: 'star',
  heart: 'heart',
  minus: 'minus',
  edit: 'edit-2',
  'arrow-left': 'arrow-left',
  settings: 'settings',
  logout: 'log-out',
  switch: 'repeat',
  share: 'share-2',
  copy: 'copy',
  navigation: 'navigation',
  qr: 'maximize',
  x: 'x',
  cloud: 'cloud',
  'cloud-off': 'cloud-off',
  download: 'download',
  alert: 'alert-triangle',
  tag: 'tag',
  folder: 'folder',
  message: 'message-circle',
  square: 'square',
  'check-square': 'check-square',
  clipboard: 'clipboard',
  zap: 'zap',
  users: 'users',
};

export function AppIcon({ name, size = 24, color = colors.zinc700 }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={ICONS[name]} size={size} color={color} />;
}

// ------------------------------------------------------------------ avatar & toggle
export function Avatar({ label, size = 44 }: { label: string; size?: number }) {
  return (
    <View
      className="items-center justify-center bg-[#f4e9df]"
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      <Txt className="font-dm-bold text-[#9a5c39]" style={{ fontSize: size * 0.4 }}>
        {initialOf(label)}
      </Txt>
    </View>
  );
}

export function Toggle({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      className={`h-7 w-12 justify-center rounded-full px-[3px] ${value ? 'bg-red-600' : 'bg-zinc-300'}`}
    >
      <View className={`h-[22px] w-[22px] rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ layar
interface ScreenProps {
  children: ReactNode;
  /** Ada tab bar di bawah? Menambah ruang kosong di akhir daftar. */
  tabBar?: boolean;
  /** Panel tetap di bawah layar (mis. total + tombol simpan), naik saat keyboard muncul. */
  footer?: ReactNode;
  className?: string;
}

export function Screen({ children, tabBar = false, footer, className = '' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" className={`flex-1 bg-gray-50 ${className}`} style={{ paddingTop: insets.top }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: footer ? 24 : tabBar ? 32 : insets.bottom + 32 }}
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingBottom: tabBar ? 0 : insets.bottom }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** Header halaman dengan tombol kembali (untuk layar Native Stack). */
export function BackHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <View className="mb-6 mt-1.5 flex-row items-center gap-3">
      <Pressable
        onPress={onBack}
        accessibilityLabel="Kembali"
        className="h-[50px] w-[50px] items-center justify-center rounded-2xl border border-zinc-200 bg-white active:bg-zinc-100"
      >
        <AppIcon name="arrow-left" color={colors.zinc900} />
      </Pressable>
      <View className="flex-1">
        {subtitle ? <Txt className="mb-0.5 text-sm font-dm-semibold text-zinc-500">{subtitle}</Txt> : null}
        <Txt className="text-[26px] font-dm-bold leading-8" numberOfLines={2}>
          {title}
        </Txt>
      </View>
    </View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Txt className="text-xl font-dm-bold">{title}</Txt>
      {subtitle ? <Txt className="mt-0.5 text-sm text-zinc-500">{subtitle}</Txt> : null}
    </View>
  );
}

export function Badge({ children, tone = 'red' }: { children: ReactNode; tone?: 'red' | 'amber' | 'green' }) {
  const palette = {
    red: 'bg-red-100 text-red-600',
    amber: 'bg-orange-50 text-orange-700',
    green: 'bg-green-100 text-green-700',
  }[tone];
  const [bg, fg] = palette.split(' ');
  return (
    <View className={`rounded-lg px-2 py-1 ${bg}`}>
      <Txt className={`text-xs font-dm-bold ${fg}`}>{children}</Txt>
    </View>
  );
}
