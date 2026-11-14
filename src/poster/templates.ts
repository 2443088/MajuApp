export type PosterRatio = '9:16' | '3:4';

export type PhotoShape = 'circle' | 'squircle' | 'rounded' | 'leaf' | 'arch';

export type PosterTemplateId =
  | 'story-4'
  | 'story-3'
  | 'story-2'
  | 'story-1'
  | 'story-list'
  | 'feed-1';

export interface PosterTemplateDef {
  id: PosterTemplateId;
  ratio: PosterRatio;
  name: string;
  short: string;
  hint: string;
  kind: 'photos' | 'list';
  photoSlots: number;
  shapes: PhotoShape[];
  usesTitle: boolean;
  defaultOrderText: string;
}

/** Tinggi = lebar x aspect. Story 1080x1920, Feed 1080x1440. */
export const RATIO_ASPECT: Record<PosterRatio, number> = {
  '9:16': 16 / 9,
  '3:4': 4 / 3,
};

export const RATIO_OUTPUT: Record<PosterRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '3:4': { width: 1080, height: 1440 },
};

export const RATIO_LABEL: Record<PosterRatio, string> = {
  '9:16': 'Story 9:16',
  '3:4': 'Feed 3:4',
};

export const POSTER_COLORS = {
  red: '#8f1d21',
  paper: '#fffdf9',
  ink: '#171311',
  muted: '#8c7f73',
  eyebrow: '#9d8d7e',
  rule: '#cbbdb0',
  divider: '#d4c5b8',
  cardBg: '#eee8df',
} as const;

const ORDER_CTA = 'ORDER FOR TOMORROW';

export const POSTER_TEMPLATES: PosterTemplateDef[] = [
  {
    id: 'story-4',
    ratio: '9:16',
    name: 'Story — 4 Foto',
    short: '4 Foto',
    hint: 'Grid 2×2 foto makanan dengan nomor badge & deskripsi',
    kind: 'photos',
    photoSlots: 4,
    shapes: ['rounded', 'rounded', 'rounded', 'rounded'],
    usesTitle: false,
    defaultOrderText: ORDER_CTA,
  },
  {
    id: 'story-3',
    ratio: '9:16',
    name: 'Story — 3 Foto',
    short: '3 Foto',
    hint: '1 foto utama di atas dan 2 foto di bawahnya',
    kind: 'photos',
    photoSlots: 3,
    shapes: ['rounded', 'rounded', 'rounded'],
    usesTitle: false,
    defaultOrderText: ORDER_CTA,
  },
  {
    id: 'story-2',
    ratio: '9:16',
    name: 'Story — 2 Foto',
    short: '2 Foto',
    hint: '2 baris horizontal: foto di kiri, judul & deskripsi di kanan',
    kind: 'photos',
    photoSlots: 2,
    shapes: ['rounded', 'rounded'],
    usesTitle: false,
    defaultOrderText: ORDER_CTA,
  },
  {
    id: 'story-1',
    ratio: '9:16',
    name: 'Story — 1 Foto',
    short: '1 Foto',
    hint: '1 foto hidangan utama besar di tengah',
    kind: 'photos',
    photoSlots: 1,
    shapes: ['rounded'],
    usesTitle: false,
    defaultOrderText: ORDER_CTA,
  },
  {
    id: 'story-list',
    ratio: '9:16',
    name: 'Story — Daftar Menu',
    short: 'Daftar Menu',
    hint: 'Daftar menu 2 kolom per kategori, tanpa foto',
    kind: 'list',
    photoSlots: 0,
    shapes: [],
    usesTitle: false,
    defaultOrderText: ORDER_CTA,
  },
  {
    id: 'feed-1',
    ratio: '3:4',
    name: 'Feed — 1 Foto',
    short: 'IG Feed',
    hint: '1 foto besar dengan badge kategori & stiker bulat miring',
    kind: 'photos',
    photoSlots: 1,
    shapes: ['rounded'],
    usesTitle: true,
    defaultOrderText: ORDER_CTA,
  },
];

export function templatesFor(ratio: PosterRatio): PosterTemplateDef[] {
  return POSTER_TEMPLATES.filter((t) => t.ratio === ratio);
}

export function getTemplate(id: PosterTemplateId): PosterTemplateDef {
  return POSTER_TEMPLATES.find((t) => t.id === id) ?? POSTER_TEMPLATES[0];
}

export interface PosterSlot {
  uri?: string;
  caption: string;
  description: string;
  showDescription: boolean;
}

export interface PosterMenuSection {
  label: string;
  items: string[];
  layout?: 'auto' | 'full' | 'half';
}

export interface PosterContent {
  brand: string;
  subtitle: string;
  showSubtitle: boolean;
  since: string;
  title: string;
  showCategory: boolean;
  topNote: string;
  showTopNote: boolean;
  dividerTagline: string;
  showDivider: boolean;
  feedSticker: string;
  showFeedSticker: boolean;
  feedLabel: string;
  showFeedLabel: boolean;
  textIntro: string;
  showTextIntro: boolean;
  menuNote: string;
  showMenuNote: boolean;
  orderText: string;
  showFooterCta: boolean;
  phone: string;
  showWhatsappBadge: boolean;
  showItemNumbers: boolean;
  slots: PosterSlot[];
  listItems: string[];
  sections?: PosterMenuSection[];
  logoUri?: string;
}

export const MAX_PHOTO_SLOTS = 4;

const DEFAULT_DESCRIPTIONS = [
  'fresh from our kitchen',
  'comfort in every bite',
  'crispy, savory, made today',
  'a simple kitchen favorite',
];

export function emptySlots(): PosterSlot[] {
  return Array.from({ length: MAX_PHOTO_SLOTS }, (_, i) => ({
    caption: '',
    description: DEFAULT_DESCRIPTIONS[i] ?? 'made fresh today',
    showDescription: true,
  }));
}

/** 0813 4495 6336 -> 0813-4495-6336 */
export function phoneWithDashes(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 9) return phone;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}