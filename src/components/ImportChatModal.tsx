import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import { GeminiError, isGeminiConfigured, parseOrderChat } from '../services/geminiParser';
import { colors } from '../theme/colors';
import type { Customer, MenuItemView } from '../types';
import { matchCustomer, matchMenu, variantLabels, type MenuMatch } from '../utils/matching';
import { AppIcon, Input, Txt } from './ui';

export interface ImportResult {
  customerId: string;
  /** Nama yang terbaca dari chat (dipakai untuk mengisi form pelanggan baru bila tidak cocok). */
  customerName: string;
  quantities: Record<string, number>;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (result: ImportResult) => void;
}

interface Row {
  key: string;
  raw: string;
  qty: number;
  match: MenuMatch;
  /** '' = belum dipilih, 'skip' = dilewati, selain itu id menu. */
  chosen: string;
}

function Chip({ label, selected, onPress, tone = 'red' }: { label: string; selected: boolean; onPress: () => void; tone?: 'red' | 'zinc' }) {
  const on = tone === 'red' ? 'border-red-600 bg-red-50' : 'border-zinc-500 bg-zinc-100';
  const onText = tone === 'red' ? 'text-red-700' : 'text-zinc-700';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-[44px] justify-center rounded-xl border-2 px-4 ${selected ? on : 'border-zinc-200 bg-white'}`}
    >
      <Txt className={`text-[14px] font-dm-bold ${selected ? onText : 'text-zinc-600'}`}>{label}</Txt>
    </Pressable>
  );
}

export function ImportChatModal({ visible, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const { menu, customers, profile, session } = useStore();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'input' | 'preview'>('input');

  const [detectedName, setDetectedName] = useState('');
  const [customerCandidates, setCustomerCandidates] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  const activeMenu = useMemo(() => menu.filter((m) => m.is_active), [menu]);
  const configured = isGeminiConfigured();

  useEffect(() => {
    if (!visible) return;
    setText('');
    setError(null);
    setLoading(false);
    setStage('input');
    setRows([]);
    setCustomerId('');
    setCustomerCandidates([]);
    setDetectedName('');
  }, [visible]);

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) setText(clip);
  };

  const process = async () => {
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseOrderChat(text, profile?.store_name ?? session?.store_name ?? '');
      const customerMatch = matchCustomer(parsed.customerName, customers);
      setDetectedName(parsed.customerName);
      setCustomerCandidates(customerMatch.candidates);
      setCustomerId(customerMatch.status === 'exact' && customerMatch.customer ? customerMatch.customer.id : '');
      setRows(
        parsed.lines.map((line, index) => {
          const match = matchMenu(line.menu, activeMenu);
          return {
            key: `${index}-${line.menu}`,
            raw: line.menu,
            qty: line.qty,
            match,
            chosen: match.status === 'exact' && match.menu ? match.menu.id : '',
          };
        }),
      );
      setStage('preview');
    } catch (e) {
      setError(e instanceof GeminiError || e instanceof Error ? e.message : 'Gagal memproses chat.');
    } finally {
      setLoading(false);
    }
  };

  const choose = (key: string, value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, chosen: value } : row)));

  const unresolved = rows.filter((row) => row.chosen === '').length;
  const usable = rows.filter((row) => row.chosen !== '' && row.chosen !== 'skip');

  const apply = () => {
    const quantities: Record<string, number> = {};
    usable.forEach((row) => {
      quantities[row.chosen] = (quantities[row.chosen] ?? 0) + row.qty;
    });
    onApply({ customerId, customerName: detectedName, quantities });
  };

  const titleOf = (id: string, fallback: MenuItemView | undefined) => fallback?.title ?? activeMenu.find((m) => m.id === id)?.title ?? '';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-3 border-b border-zinc-100 bg-white px-[22px] py-3.5">
          <View className="flex-1">
            <Txt className="text-[19px] font-dm-bold">{stage === 'input' ? 'Import Chat WA' : 'Pratinjau Pesanan'}</Txt>
            <Txt className="text-xs text-zinc-500">
              {stage === 'input' ? 'Dibaca otomatis oleh Gemini' : 'Periksa dulu sebelum masuk ke form'}
            </Txt>
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
          {stage === 'input' ? (
            <View className="gap-3">
              <Txt className="text-sm leading-5 text-zinc-600">
                Tempel chat WhatsApp pelanggan yang memesan. Ongkir diabaikan. Nomor HP dan tautan dibuang sebelum teks
                dikirim ke Google Gemini.
              </Txt>

              {!configured ? (
                <View className="flex-row items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <AppIcon name="alert" size={18} color={colors.amber600} />
                  <Txt className="flex-1 text-[13px] leading-5 text-yellow-900">
                    API key Gemini belum diisi. Tambahkan EXPO_PUBLIC_GEMINI_API_KEY di file .env (lihat PANDUAN_UPDATE.md),
                    lalu jalankan ulang aplikasi.
                  </Txt>
                </View>
              ) : null}

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
                placeholder={'Contoh:\nBu Lusi: pesen susu kedelai 2 sama nasi kotak 3 ya\nOngkir 10rb'}
                className="min-h-[200px] rounded-2xl border border-zinc-200 bg-white px-4 pt-3.5 text-base leading-[22px]"
              />

              {error ? (
                <View className="flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AppIcon name="alert" size={18} color={colors.red600} />
                  <Txt className="flex-1 text-[13px] leading-5 text-red-800">{error}</Txt>
                </View>
              ) : null}

              <Pressable
                onPress={() => void process()}
                disabled={loading || text.trim().length < 3 || !configured}
                className={`min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl ${
                  loading || text.trim().length < 3 || !configured ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
                }`}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <AppIcon name="zap" size={19} color={colors.white} />
                    <Txt className="text-base font-dm-bold text-white">Proses dengan Gemini</Txt>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-2.5 rounded-[18px] border border-zinc-100 bg-white p-4">
                <Txt className="text-[13px] font-dm-bold uppercase tracking-wider text-zinc-400">Pelanggan</Txt>
                <Txt className="text-lg font-dm-bold">{detectedName || 'Nama tidak terbaca di chat'}</Txt>
                {customerCandidates.length > 0 ? (
                  <>
                    <Txt className="text-[13px] text-zinc-500">
                      {customerId ? 'Cocok dengan pelanggan tersimpan:' : 'Ada beberapa yang mirip, pilih satu:'}
                    </Txt>
                    <View className="flex-row flex-wrap gap-2">
                      {customerCandidates.map((c) => (
                        <Chip key={c.id} label={c.name} selected={customerId === c.id} onPress={() => setCustomerId(c.id)} />
                      ))}
                      <Chip label="Pilih nanti" selected={customerId === ''} tone="zinc" onPress={() => setCustomerId('')} />
                    </View>
                  </>
                ) : (
                  <Txt className="text-[13px] leading-5 text-amber-700">
                    Belum ada pelanggan tersimpan yang cocok. Menu tetap diisi; pilih atau tambah pelanggan di form.
                  </Txt>
                )}
              </View>

              <View className="gap-3">
                <Txt className="text-[13px] font-dm-bold uppercase tracking-wider text-zinc-400">
                  Pesanan ({rows.length} menu)
                </Txt>
                {rows.map((row) => {
                  const labels = row.match.status === 'ambiguous' ? variantLabels(row.raw, row.match.candidates) : [];
                  return (
                    <View
                      key={row.key}
                      className={`gap-2.5 rounded-[18px] border bg-white p-4 ${
                        row.chosen === '' ? 'border-amber-300' : 'border-zinc-100'
                      }`}
                    >
                      <View className="flex-row items-center justify-between gap-2">
                        <Txt className="flex-1 text-base font-dm-bold" numberOfLines={2}>
                          {row.raw}
                        </Txt>
                        <View className="rounded-lg bg-red-100 px-2.5 py-1">
                          <Txt className="text-sm font-dm-bold text-red-700">{row.qty}x</Txt>
                        </View>
                      </View>

                      {row.match.status === 'exact' ? (
                        <View className="flex-row flex-wrap items-center gap-2">
                          <AppIcon name="check" size={16} color={colors.green600} />
                          <Txt className="text-[13px] font-dm-semibold text-green-700">
                            {titleOf(row.chosen, row.match.menu) || 'Dilewati'}
                          </Txt>
                          <Pressable onPress={() => choose(row.key, row.chosen === 'skip' ? row.match.menu?.id ?? '' : 'skip')} hitSlop={8}>
                            <Txt className="text-[13px] font-dm-bold text-zinc-500">
                              {row.chosen === 'skip' ? 'Pakai lagi' : 'Lewati'}
                            </Txt>
                          </Pressable>
                        </View>
                      ) : (
                        <>
                          <Txt className={`text-[13px] font-dm-semibold ${row.match.status === 'ambiguous' ? 'text-red-700' : 'text-amber-700'}`}>
                            {row.match.status === 'ambiguous' ? 'Pilih variasi:' : 'Menu tidak dikenali. Pilih yang paling dekat:'}
                          </Txt>
                          <View className="flex-row flex-wrap gap-2">
                            {row.match.candidates.map((candidate, i) => (
                              <Chip
                                key={candidate.id}
                                label={row.match.status === 'ambiguous' ? labels[i] : candidate.title}
                                selected={row.chosen === candidate.id}
                                onPress={() => choose(row.key, candidate.id)}
                              />
                            ))}
                            <Chip label="Lewati" selected={row.chosen === 'skip'} tone="zinc" onPress={() => choose(row.key, 'skip')} />
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>

              <Txt className="text-xs leading-[18px] text-zinc-400">
                Ongkir dan biaya lain tidak diproses. Jumlah bisa diubah lagi di form setelah diterapkan.
              </Txt>
            </View>
          )}
        </ScrollView>

        {stage === 'preview' ? (
          <View className="border-t border-zinc-100 bg-white px-[22px] pt-3.5" style={{ paddingBottom: Math.max(insets.bottom, 14) }}>
            {unresolved > 0 ? (
              <Txt className="mb-2 text-center text-xs text-amber-700">
                {unresolved} menu masih perlu dipilih atau dilewati.
              </Txt>
            ) : null}
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => setStage('input')}
                className="min-h-[56px] items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 active:bg-zinc-100"
              >
                <Txt className="font-dm-bold text-zinc-700">Ulangi</Txt>
              </Pressable>
              <Pressable
                onPress={apply}
                disabled={unresolved > 0 || usable.length === 0}
                className={`min-h-[56px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl ${
                  unresolved > 0 || usable.length === 0 ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
                }`}
              >
                <AppIcon name="check" size={20} color={colors.white} />
                <Txt className="text-base font-dm-bold text-white">Terapkan ke Form</Txt>
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}
