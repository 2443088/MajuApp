import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { PosterTemplate } from '../components/PosterTemplate';
import { AppIcon, BackHeader, Input, Screen, Toggle, Txt } from '../components/ui';
import { useStore } from '../context/StoreContext';
import type { RootStackParamList } from '../navigation/types';
import {
  RATIO_LABEL,
  RATIO_OUTPUT,
  emptySlots,
  getTemplate,
  templatesFor,
  type PosterContent,
  type PosterMenuSection,
  type PosterRatio,
  type PosterSlot,
  type PosterTemplateId,
} from '../poster/templates';
import { pickFromGallery, pickLogoImage } from '../services/imageService';
import { colors } from '../theme/colors';

const RATIOS: PosterRatio[] = ['9:16', '3:4'];
const MAX_LIST_ITEMS = 50;

function Label({ children }: { children: string }) {
  return <Txt className="mb-1.5 text-[13px] font-dm-bold text-zinc-600">{children}</Txt>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  visible,
  onVisibleChange,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  maxLength?: number;
  visible?: boolean;
  onVisibleChange?: (v: boolean) => void;
}) {
  return (
    <View>
      <View className="mb-1.5 flex-row items-center justify-between">
        <Txt className="text-[13px] font-dm-bold text-zinc-600">{label}</Txt>
        {onVisibleChange ? (
          <Toggle value={visible ?? true} onValueChange={onVisibleChange} label={`Tampilkan ${label}`} />
        ) : null}
      </View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={visible !== false}
        className={`h-12 rounded-xl border border-zinc-200 px-3.5 text-base ${
          visible === false ? 'bg-zinc-100 text-zinc-400' : 'bg-white'
        }`}
      />
    </View>
  );
}

function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="min-h-[46px] flex-row items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5">
      <Txt className="text-[13px] font-dm-bold text-zinc-700">{label}</Txt>
      <Toggle value={value} onValueChange={onValueChange} label={label} />
    </View>
  );
}

export function PosterStudioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, session, menu, labels, savePoster, logos, saveLogo } = useStore();
  const { width: screenWidth } = useWindowDimensions();
  const previewWidth = Math.min(screenWidth - 44, 420);

  const [ratio, setRatio] = useState<PosterRatio>('9:16');
  const [templateId, setTemplateId] = useState<PosterTemplateId>('story-4');
  const template = getTemplate(templateId);

  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [addLogoModalOpen, setAddLogoModalOpen] = useState(false);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoTempUri, setNewLogoTempUri] = useState<string | null>(null);

  const [brand, setBrand] = useState(profile?.store_name ?? session?.store_name ?? 'AHUA');
  const [subtitle, setSubtitle] = useState('MENU BESOK');
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [title, setTitle] = useState('SIDE DISH');
  const [showCategory, setShowCategory] = useState(true);

  const [topNote, setTopNote] = useState("TODAY'S KITCHEN NOTE");
  const [showTopNote, setShowTopNote] = useState(true);
  const [dividerTagline, setDividerTagline] = useState('FRESHLY MADE — WITH LOVE');
  const [showDivider, setShowDivider] = useState(true);
  const [feedSticker, setFeedSticker] = useState('made fresh every day');
  const [showFeedSticker, setShowFeedSticker] = useState(true);
  const [feedLabel, setFeedLabel] = useState('OUR KITCHEN RECOMMENDS');
  const [showFeedLabel, setShowFeedLabel] = useState(true);
  const [textIntro, setTextIntro] = useState('Good food, prepared for tomorrow.');
  const [showTextIntro, setShowTextIntro] = useState(true);
  const [menuNote, setMenuNote] = useState('PRE-ORDER TODAY • ENJOY TOMORROW');
  const [showMenuNote, setShowMenuNote] = useState(true);

  const [orderText, setOrderText] = useState(template.defaultOrderText);
  const [showFooterCta, setShowFooterCta] = useState(true);
  const [phone, setPhone] = useState(profile?.phone_number ?? '');
  const [showWhatsappBadge, setShowWhatsappBadge] = useState(true);
  const [showItemNumbers, setShowItemNumbers] = useState(true);

  const [slots, setSlots] = useState<PosterSlot[]>(emptySlots());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => menu.slice(0, MAX_LIST_ITEMS).map((m) => m.id));
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const posterRef = useRef<React.ElementRef<typeof View>>(null);

  const selectedLogo = logos.find((l) => l.id === selectedLogoId);
  const logoUri = selectedLogo?.uri;

  const groupedMenu = useMemo(() => {
    const groups: { label: string; items: typeof menu }[] = [];

    for (const lbl of labels) {
      const items = menu.filter((m) => m.label?.trim() === lbl);
      if (items.length > 0) groups.push({ label: lbl, items });
    }

    const seen = new Set(labels);
    for (const item of menu) {
      const l = item.label?.trim();
      if (l && !seen.has(l) && !groups.some((g) => g.label === l)) {
        const items = menu.filter((m) => m.label?.trim() === l);
        groups.push({ label: l, items });
      }
    }

    const unlabeled = menu.filter((m) => !m.label || !m.label.trim());
    if (unlabeled.length > 0) groups.push({ label: '', items: unlabeled });

    return groups;
  }, [menu, labels]);

  const sections = useMemo<PosterMenuSection[]>(() => {
    return groupedMenu
      .map((g) => ({
        label: g.label,
        items: g.items.filter((item) => selectedIds.includes(item.id)).map((item) => item.title),
      }))
      .filter((g) => g.items.length > 0);
  }, [groupedMenu, selectedIds]);

  const content: PosterContent = useMemo(
    () => ({
      brand,
      subtitle,
      showSubtitle,
      since: '',
      title,
      showCategory,
      topNote,
      showTopNote,
      dividerTagline,
      showDivider,
      feedSticker,
      showFeedSticker,
      feedLabel,
      showFeedLabel,
      textIntro,
      showTextIntro,
      menuNote,
      showMenuNote,
      orderText,
      showFooterCta,
      phone,
      showWhatsappBadge,
      showItemNumbers,
      slots,
      listItems: sections.flatMap((s) => s.items),
      sections,
      logoUri,
    }),
    [
      brand,
      subtitle,
      showSubtitle,
      title,
      showCategory,
      topNote,
      showTopNote,
      dividerTagline,
      showDivider,
      feedSticker,
      showFeedSticker,
      feedLabel,
      showFeedLabel,
      textIntro,
      showTextIntro,
      menuNote,
      showMenuNote,
      orderText,
      showFooterCta,
      phone,
      showWhatsappBadge,
      showItemNumbers,
      slots,
      sections,
      logoUri,
    ],
  );

  const chooseTemplate = (id: PosterTemplateId) => {
    const next = getTemplate(id);
    if (orderText === template.defaultOrderText) setOrderText(next.defaultOrderText);
    if (id === 'feed-1' && subtitle === 'MENU BESOK') setSubtitle('SINCE 2002');
    else if (id !== 'feed-1' && subtitle === 'SINCE 2002') setSubtitle('MENU BESOK');
    setTemplateId(id);
  };

  const chooseRatio = (next: PosterRatio) => {
    setRatio(next);
    const first = templatesFor(next)[0];
    if (first && getTemplate(templateId).ratio !== next) chooseTemplate(first.id);
  };

  const updateSlot = (index: number, patch: Partial<PosterSlot>) =>
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  const pickFromMenu = (index: number, uri: string, caption: string) => {
    updateSlot(index, { uri, caption });
    setPickerSlot(null);
  };

  const pickFromPhone = async (index: number) => {
    setPickerSlot(null);
    const picked = await pickFromGallery(true);
    if (picked) updateSlot(index, { uri: picked.uri });
  };

  const handlePickLogo = async () => {
    const picked = await pickLogoImage();
    if (!picked) return;
    setNewLogoTempUri(picked.uri);
    setNewLogoName('Logo Menu');
    setAddLogoModalOpen(true);
  };

  const handleSaveLogo = async () => {
    if (!newLogoTempUri) return;
    try {
      const saved = await saveLogo(newLogoName, newLogoTempUri);
      setSelectedLogoId(saved.id);
      setAddLogoModalOpen(false);
      setNewLogoTempUri(null);
    } catch {
      Alert.alert('Gagal menyimpan logo', 'Coba ulangi pemilihan gambar logo.');
    }
  };

  const toggleGroupItems = (itemIds: string[]) => {
    const allSelected = itemIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((curr) => curr.filter((id) => !itemIds.includes(id)));
    } else {
      setSelectedIds((curr) => Array.from(new Set([...curr, ...itemIds])).slice(0, MAX_LIST_ITEMS));
    }
  };

  const toggleItem = (id: string) =>
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_LIST_ITEMS) {
        Alert.alert('Terlalu banyak', `Daftar poster maksimal ${MAX_LIST_ITEMS} menu agar tetap terbaca.`);
        return current;
      }
      return [...current, id];
    });

  const missing =
    template.kind === 'list'
      ? content.listItems.length === 0
        ? 'Pilih minimal 1 menu.'
        : null
      : slots.slice(0, template.photoSlots).some((slot) => !slot.uri)
        ? `Isi ${template.photoSlots} foto dulu.`
        : null;

  const sharePoster = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Tidak bisa berbagi', 'Fitur berbagi berkas tidak tersedia di perangkat ini.');
      return;
    }
    setBusy(true);
    try {
      const out = RATIO_OUTPUT[template.ratio];
      const temp = await captureRef(posterRef as any, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: out.width,
        height: out.height,
      });
      const label = template.kind === 'list' ? `Daftar menu ${brand}` : slots[0]?.caption || template.name;
      const saved = await savePoster(temp, label, template.ratio);
      await Sharing.shareAsync(saved.uri, {
        mimeType: 'image/png',
        dialogTitle: 'Bagikan poster ke WhatsApp / Instagram',
      });
    } catch {
      Alert.alert('Poster gagal dibuat', 'Coba lagi. Bila foto dari galeri, pilih ulang fotonya.');
    } finally {
      setBusy(false);
    }
  };

  const isFeed = template.id === 'feed-1';
  const isText = template.kind === 'list';

  const footer = (
    <View className="border-t border-zinc-100 bg-white px-[22px] py-3.5">
      {missing ? <Txt className="mb-2 text-center text-xs text-amber-600">{missing}</Txt> : null}
      <Pressable
        onPress={() => void sharePoster()}
        disabled={busy || missing !== null}
        className={`min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl ${
          busy || missing ? 'bg-zinc-300' : 'bg-red-600 active:bg-red-700'
        }`}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <AppIcon name="share" size={20} color={colors.white} />
            <Txt className="text-base font-dm-bold text-white">Simpan & Bagikan</Txt>
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackHeader title="Buat Poster" subtitle="Space" onBack={() => navigation.goBack()} />

      <View className="mb-3 flex-row rounded-[14px] bg-zinc-200/70 p-1">
        {RATIOS.map((value) => (
          <Pressable
            key={value}
            onPress={() => chooseRatio(value)}
            className={`min-h-[44px] flex-1 items-center justify-center rounded-[11px] ${ratio === value ? 'bg-white' : ''}`}
          >
            <Txt className={`text-[13px] font-dm-semibold ${ratio === value ? 'text-red-600' : 'text-zinc-500'}`}>
              {RATIO_LABEL[value]}
            </Txt>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="mb-1">
        {templatesFor(ratio).map((item) => {
          const selected = item.id === templateId;
          return (
            <Pressable
              key={item.id}
              onPress={() => chooseTemplate(item.id)}
              className={`min-h-[66px] w-[148px] justify-center rounded-2xl border px-3 py-2 ${
                selected ? 'border-2 border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
              }`}
            >
              <Txt className={`text-sm font-dm-bold ${selected ? 'text-red-700' : 'text-zinc-700'}`}>{item.short}</Txt>
              <Txt className="mt-0.5 text-[11px] text-zinc-500" numberOfLines={2}>
                {item.kind === 'list' ? 'Daftar teks' : `${item.photoSlots} foto`}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <Txt className="mb-3 mt-1 text-xs text-zinc-500">{template.hint}</Txt>

      <View className="items-center">
        <View className="overflow-hidden rounded-xl border border-zinc-200" style={{ elevation: 3 }}>
          <PosterTemplate ref={posterRef} template={template} content={content} width={previewWidth} />
        </View>
      </View>
      <Txt className="mb-5 mt-2 text-center text-xs text-zinc-400">
        Hasil disimpan {RATIO_OUTPUT[template.ratio].width}×{RATIO_OUTPUT[template.ratio].height} px · Tanpa harga
      </Txt>

      <View className="mb-5 gap-3 rounded-[18px] border border-zinc-100 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Txt className="text-base font-dm-bold">Identitas Toko</Txt>
          <Pressable onPress={() => void handlePickLogo()} hitSlop={8} className="flex-row items-center gap-1">
            <AppIcon name="plus" size={14} color={colors.red600} />
            <Txt className="text-[13px] font-dm-bold text-red-600">Tambah Logo</Txt>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} className="py-1">
          <Pressable
            onPress={() => setSelectedLogoId(null)}
            className={`min-h-[68px] w-[108px] items-center justify-center rounded-2xl border p-2 ${
              selectedLogoId === null ? 'border-2 border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
            }`}
          >
            <AppIcon name="book" size={19} color={selectedLogoId === null ? colors.red600 : colors.zinc500} />
            <Txt className={`mt-1 text-center text-xs font-dm-bold ${selectedLogoId === null ? 'text-red-700' : 'text-zinc-600'}`}>
              Teks Judul
            </Txt>
          </Pressable>
          {logos.map((logo) => {
            const isSelected = selectedLogoId === logo.id;
            return (
              <Pressable
                key={logo.id}
                onPress={() => setSelectedLogoId(logo.id)}
                className={`min-h-[68px] w-[120px] items-center justify-center rounded-2xl border p-2 ${
                  isSelected ? 'border-2 border-red-600 bg-red-50' : 'border-zinc-200 bg-white'
                }`}
              >
                <Image source={{ uri: logo.uri }} style={{ width: 55, height: 30 }} resizeMode="contain" />
                <Txt
                  numberOfLines={1}
                  className={`mt-1 text-center text-xs font-dm-bold ${isSelected ? 'text-red-700' : 'text-zinc-600'}`}
                >
                  {logo.name}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedLogoId === null ? (
          <>
            <Field label="Nama toko" value={brand} onChangeText={setBrand} maxLength={24} />
            <Field
              label="Subjudul"
              value={subtitle}
              onChangeText={setSubtitle}
              maxLength={25}
              visible={showSubtitle}
              onVisibleChange={setShowSubtitle}
            />
          </>
        ) : null}
      </View>

      {template.kind === 'photos' ? (
        <View className="mb-5 gap-3.5 rounded-[18px] border border-zinc-100 bg-white p-4">
          <Txt className="text-base font-dm-bold">Foto & Nama Hidangan</Txt>
          {Array.from({ length: template.photoSlots }, (_, i) => {
            const slot = slots[i];
            return (
              <View key={i} className="gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3">
                <View className="flex-row items-center gap-3">
                  <Pressable onPress={() => setPickerSlot(i)} accessibilityLabel={`Pilih foto ${i + 1}`}>
                    <View className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                      {slot?.uri ? (
                        <Image source={{ uri: slot.uri }} className="h-full w-full" resizeMode="cover" />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <AppIcon name="image" size={22} color={colors.zinc400} />
                        </View>
                      )}
                    </View>
                    <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-red-600">
                      <AppIcon name="edit" size={12} color={colors.white} />
                    </View>
                  </Pressable>
                  <View className="flex-1">
                    <Label>{`Makanan ${i + 1}`}</Label>
                    <Input
                      value={slot?.caption ?? ''}
                      onChangeText={(text) => updateSlot(i, { caption: text })}
                      placeholder="Tulis nama makanan"
                      maxLength={30}
                      className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                    />
                  </View>
                </View>

                <View className="border-t border-zinc-200/70 pt-2">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Txt className="text-[11px] font-dm-bold text-zinc-500">Deskripsi singkat</Txt>
                    <Toggle
                      value={slot?.showDescription ?? true}
                      onValueChange={(v) => updateSlot(i, { showDescription: v })}
                      label={`Deskripsi makanan ${i + 1}`}
                    />
                  </View>
                  <Input
                    value={slot?.description ?? ''}
                    onChangeText={(text) => updateSlot(i, { description: text })}
                    placeholder="Contoh: fresh from our kitchen"
                    maxLength={45}
                    editable={slot?.showDescription !== false}
                    className={`h-10 rounded-xl border border-zinc-200 px-3 text-xs ${
                      slot?.showDescription === false ? 'bg-zinc-100 text-zinc-400' : 'bg-white'
                    }`}
                  />
                </View>
              </View>
            );
          })}

          {isFeed ? (
            <Field
              label="Badge kategori"
              value={title}
              onChangeText={setTitle}
              placeholder="SIDE DISH"
              maxLength={22}
              visible={showCategory}
              onVisibleChange={setShowCategory}
            />
          ) : null}
        </View>
      ) : (
        <View className="mb-5 rounded-[18px] border border-zinc-100 bg-white p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Txt className="text-base font-dm-bold">Menu di daftar ({content.listItems.length})</Txt>
            <View className="flex-row gap-3">
              <Pressable onPress={() => setSelectedIds(menu.slice(0, MAX_LIST_ITEMS).map((m) => m.id))} hitSlop={8}>
                <Txt className="text-[13px] font-dm-bold text-red-600">Semua</Txt>
              </Pressable>
              <Pressable onPress={() => setSelectedIds([])} hitSlop={8}>
                <Txt className="text-[13px] font-dm-bold text-zinc-500">Kosongkan</Txt>
              </Pressable>
            </View>
          </View>

          {groupedMenu.length === 0 ? (
            <Txt className="py-3 text-sm text-zinc-400">Belum ada menu. Tambahkan dulu di tab Menu.</Txt>
          ) : (
            <View className="gap-4">
              {groupedMenu.map((group) => {
                const groupItemIds = group.items.map((it) => it.id);
                const selectedInGroup = groupItemIds.filter((id) => selectedIds.includes(id));
                const allSelected = selectedInGroup.length === groupItemIds.length;

                return (
                  <View key={group.label || '__unlabeled__'} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Txt className="font-dm-bold text-sm text-zinc-800">
                        {group.label ? group.label : 'Lainnya'} ({selectedInGroup.length}/{group.items.length})
                      </Txt>
                      <Pressable onPress={() => toggleGroupItems(groupItemIds)} hitSlop={6}>
                        <Txt className="text-xs font-dm-bold text-red-600">
                          {allSelected ? 'Batal' : 'Pilih Semua'}
                        </Txt>
                      </Pressable>
                    </View>

                    <View className="gap-1">
                      {group.items.map((item) => {
                        const on = selectedIds.includes(item.id);
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => toggleItem(item.id)}
                            className="min-h-[40px] flex-row items-center gap-3 rounded-lg px-2 py-1 active:bg-zinc-100"
                          >
                            <View
                              className={`h-5 w-5 items-center justify-center rounded-md border-2 ${
                                on ? 'border-red-600 bg-red-600' : 'border-zinc-300 bg-white'
                              }`}
                            >
                              {on ? <AppIcon name="check" size={12} color={colors.white} /> : null}
                            </View>
                            <Txt className="flex-1 text-sm font-dm-semibold text-zinc-700" numberOfLines={1}>
                              {item.title}
                            </Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View className="mb-5 gap-3 rounded-[18px] border border-zinc-100 bg-white p-4">
        <Txt className="text-base font-dm-bold">Detail & Teks Dekoratif</Txt>

        {!isFeed ? (
          <Field
            label="Catatan atas (eyebrow)"
            value={topNote}
            onChangeText={setTopNote}
            maxLength={30}
            visible={showTopNote}
            onVisibleChange={setShowTopNote}
          />
        ) : null}

        {!isFeed && !isText ? (
          <>
            <Field
              label="Tagline garis pemisah"
              value={dividerTagline}
              onChangeText={setDividerTagline}
              maxLength={35}
              visible={showDivider}
              onVisibleChange={setShowDivider}
            />
            <SwitchRow label="Nomor urut foto (01, 02)" value={showItemNumbers} onValueChange={setShowItemNumbers} />
          </>
        ) : null}

        {isFeed ? (
          <>
            <Field
              label="Label rekomendasi"
              value={feedLabel}
              onChangeText={setFeedLabel}
              maxLength={28}
              visible={showFeedLabel}
              onVisibleChange={setShowFeedLabel}
            />
            <Field
              label="Stiker bulat miring"
              value={feedSticker}
              onChangeText={setFeedSticker}
              maxLength={22}
              visible={showFeedSticker}
              onVisibleChange={setShowFeedSticker}
            />
          </>
        ) : null}

        {isText ? (
          <>
            <Field
              label="Deskripsi pembuka"
              value={textIntro}
              onChangeText={setTextIntro}
              maxLength={45}
              visible={showTextIntro}
              onVisibleChange={setShowTextIntro}
            />
            <Field
              label="Catatan bawah menu"
              value={menuNote}
              onChangeText={setMenuNote}
              maxLength={38}
              visible={showMenuNote}
              onVisibleChange={setShowMenuNote}
            />
            <SwitchRow label="Nomor urut daftar (01, 02)" value={showItemNumbers} onValueChange={setShowItemNumbers} />
          </>
        ) : null}
      </View>

      <View className="gap-3 rounded-[18px] border border-zinc-100 bg-white p-4">
        <Txt className="text-base font-dm-bold">Footer Pemesanan</Txt>
        <Field
          label="Teks ajakan pesan"
          value={orderText}
          onChangeText={setOrderText}
          maxLength={28}
          visible={showFooterCta}
          onVisibleChange={setShowFooterCta}
        />
        <Field label="Nomor WhatsApp di poster" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} />
        <SwitchRow label="Badge bulat WA" value={showWhatsappBadge} onValueChange={setShowWhatsappBadge} />
      </View>

      <Modal
        transparent
        visible={pickerSlot !== null}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPickerSlot(null)}
      >
        <View className="flex-1 justify-end bg-zinc-900/40">
          <Pressable className="flex-1" onPress={() => setPickerSlot(null)} accessibilityLabel="Tutup" />
          <View className="max-h-[75%] rounded-t-[28px] bg-gray-50 px-[22px] pb-8 pt-3.5">
            <View className="mb-4 h-[5px] w-[42px] self-center rounded bg-zinc-300" />
            <Txt className="mb-3 text-xl font-dm-bold">{`Foto untuk slot ${(pickerSlot ?? 0) + 1}`}</Txt>
            <Pressable
              onPress={() => pickerSlot !== null && void pickFromPhone(pickerSlot)}
              className="mb-3 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-red-600 active:bg-red-700"
            >
              <AppIcon name="image" size={19} color={colors.white} />
              <Txt className="font-dm-bold text-white">Pilih dari galeri</Txt>
            </Pressable>
            <Txt className="mb-2 text-sm font-dm-semibold text-zinc-500">Atau pakai foto menu</Txt>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {menu.filter((m) => m.image_uri).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => pickerSlot !== null && item.image_uri && pickFromMenu(pickerSlot, item.image_uri, item.title)}
                    className="min-h-[64px] flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-2 active:bg-zinc-50"
                  >
                    <Image source={{ uri: item.image_uri }} className="h-12 w-12 rounded-xl" />
                    <Txt className="flex-1 font-dm-semibold" numberOfLines={1}>
                      {item.title}
                    </Txt>
                  </Pressable>
                ))}
                {menu.filter((m) => m.image_uri).length === 0 ? (
                  <Txt className="py-3 text-center text-sm text-zinc-400">Belum ada menu yang punya foto.</Txt>
                ) : null}
              </View>
            </ScrollView>
            {pickerSlot !== null && slots[pickerSlot]?.uri ? (
              <Pressable
                onPress={() => {
                  updateSlot(pickerSlot, { uri: undefined });
                  setPickerSlot(null);
                }}
                className="mt-3 min-h-[48px] items-center justify-center rounded-2xl bg-red-50"
              >
                <Txt className="font-dm-bold text-red-600">Hapus foto slot ini</Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={addLogoModalOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAddLogoModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-zinc-900/40 px-5">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <Txt className="mb-1 text-lg font-dm-bold">Beri Nama Logo</Txt>
            <Txt className="mb-4 text-xs text-zinc-500">Contoh: Logo Utama, Logo Watermark</Txt>
            {newLogoTempUri ? (
              <View className="mb-4 h-24 items-center justify-center rounded-xl bg-zinc-50 p-2">
                <Image source={{ uri: newLogoTempUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
            ) : null}
            <Input
              value={newLogoName}
              onChangeText={setNewLogoName}
              placeholder="Nama logo..."
              autoFocus
              className="mb-4 h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-base"
            />
            <View className="flex-row justify-end gap-2">
              <Pressable
                onPress={() => {
                  setAddLogoModalOpen(false);
                  setNewLogoTempUri(null);
                }}
                className="min-h-[42px] items-center justify-center rounded-xl px-4 active:bg-zinc-100"
              >
                <Txt className="font-dm-semibold text-zinc-600">Batal</Txt>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveLogo()}
                className="min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-5 active:bg-red-700"
              >
                <Txt className="font-dm-bold text-white">Simpan Logo</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}