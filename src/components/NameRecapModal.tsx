import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import { colors } from '../theme/colors';
import { matchCustomer, parseNameList, type CustomerMatch } from '../utils/matching';
import { AppIcon, Input, Txt } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Dipanggil dengan id pelanggan yang akan dicentang. */
  onApply: (customerIds: string[]) => void;
}

interface Row {
  key: string;
  name: string;
  match: CustomerMatch;
  /** '' = belum dipilih / dilewati. */
  chosen: string;
}

/**
 * Tempel rekap nama dari chat WA ("1. Bu Lusi / 2. Pak Andi ..."). Dicocokkan ke daftar
 * pelanggan secara lokal (tanpa internet, tanpa Gemini), lalu dicentang otomatis.
 */
export function NameRecapModal({ visible, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const { customers } = useStore();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setRows(null);
  }, [visible]);

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) setText(clip);
  };

  const match = () => {
    const names = parseNameList(text);
    setRows(
      names.map((name, index) => {
        const result = matchCustomer(name, customers);
        return {
          key: `${index}-${name}`,
          name,
          match: result,
          chosen: result.status === 'exact' && result.customer ? result.customer.id : '',
        };
      }),
    );
  };

  const choose = (key: string, id: string) =>
    setRows((current) => (current ?? []).map((row) => (row.key === key ? { ...row, chosen: row.chosen === id ? '' : id } : row)));

  const chosenIds = Array.from(new Set((rows ?? []).map((r) => r.chosen).filter(Boolean)));
  const notFound = (rows ?? []).filter((r) => r.match.status === 'none').length;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-3 border-b border-zinc-100 bg-white px-[22px] py-3.5">
          <View className="flex-1">
            <Txt className="text-[19px] font-dm-bold">Tempel Rekap Nama</Txt>
            <Txt className="text-xs text-zinc-500">Centang pelanggan otomatis dari chat WA</Txt>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Tutup"
            className="h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 active:bg-zinc-200"
          >
            <AppIcon name="x" size={20} color={colors.zinc700} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: 32 }}>
          {rows === null ? (
            <View className="gap-3">
              <Txt className="text-sm leading-5 text-zinc-600">
                Satu nama per baris, atau dipisah koma. Nomor urut dan tanda poin tidak masalah.
              </Txt>
              <Pressable
                onPress={() => void paste()}
                className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-red-500 bg-red-50/60 active:bg-red-50"
              >
                <AppIcon name="clipboard" size={18} color={colors.red600} />
                <Txt className="font-dm-bold text-red-600">Tempel dari clipboard</Txt>
              </Pressable>
              <Input
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
                placeholder={'1. Bu Lusi\n2. Pak Andi\n3. Sari'}
                className="min-h-[200px] rounded-2xl border border-zinc-200 bg-white px-4 pt-3.5 text-base leading-[22px]"
              />
              <Pressable
                onPress={match}
                disabled={text.trim().length < 2}
                className={`min-h-[56px] items-center justify-center rounded-2xl ${
                  text.trim().length < 2 ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
                }`}
              >
                <Txt className="text-base font-dm-bold text-white">Cocokkan Nama</Txt>
              </Pressable>
            </View>
          ) : rows.length === 0 ? (
            <View className="items-center gap-3 py-8">
              <Txt className="text-center text-zinc-500">Tidak ada nama yang terbaca dari teks ini.</Txt>
              <Pressable onPress={() => setRows(null)} className="rounded-xl bg-red-50 px-4 py-3">
                <Txt className="font-dm-bold text-red-600">Ubah teks</Txt>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <Txt className="text-sm text-zinc-600">
                {chosenIds.length} dari {rows.length} nama cocok{notFound > 0 ? `, ${notFound} tidak ditemukan` : ''}.
              </Txt>
              {rows.map((row) => (
                <View
                  key={row.key}
                  className={`gap-2 rounded-[16px] border bg-white p-3.5 ${
                    row.match.status === 'none' ? 'border-zinc-200' : row.chosen ? 'border-green-200' : 'border-amber-300'
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Txt className="flex-1 text-base font-dm-bold" numberOfLines={1}>
                      {row.name}
                    </Txt>
                    {row.match.status === 'none' ? (
                      <Txt className="text-xs font-dm-semibold text-zinc-400">Tidak ditemukan</Txt>
                    ) : row.chosen ? (
                      <AppIcon name="check" size={18} color={colors.green600} />
                    ) : null}
                  </View>
                  {row.match.candidates.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {row.match.candidates.map((c) => {
                        const on = row.chosen === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => choose(row.key, c.id)}
                            className={`min-h-[40px] justify-center rounded-xl border-2 px-3.5 ${
                              on ? 'border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
                            }`}
                          >
                            <Txt className={`text-[13px] font-dm-bold ${on ? 'text-red-700' : 'text-zinc-600'}`}>{c.name}</Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {rows !== null && rows.length > 0 ? (
          <View className="flex-row gap-2.5 border-t border-zinc-100 bg-white px-[22px] pt-3.5" style={{ paddingBottom: Math.max(insets.bottom, 14) }}>
            <Pressable
              onPress={() => setRows(null)}
              className="min-h-[56px] items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 active:bg-zinc-100"
            >
              <Txt className="font-dm-bold text-zinc-700">Ubah teks</Txt>
            </Pressable>
            <Pressable
              onPress={() => onApply(chosenIds)}
              disabled={chosenIds.length === 0}
              className={`min-h-[56px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl ${
                chosenIds.length === 0 ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
              }`}
            >
              <AppIcon name="check-square" size={20} color={colors.white} />
              <Txt className="text-base font-dm-bold text-white">Centang {chosenIds.length} Pelanggan</Txt>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}
