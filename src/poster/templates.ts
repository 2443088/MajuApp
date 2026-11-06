export type PosterRatio = '9:16' | '3:4';

export type PhotoShape = 'circle' | 'squircle' | 'rounded' | 'leaf' | 'arch';

export type PosterTemplateId =
  | 'story-grid'
  | 'story-circles'
  | 'story-vertical'
  | 'story-hero'
  | 'story-list'
  | 'feed-promo'
  | 'feed-quad'
  | 'feed-list';

export interface PosterTemplateDef {
  id: PosterTemplateId;
  ratio: PosterRatio;
  name: string;
  hint: string;
  kind: 'photos' | 'list';
  photoSlots: number;
  /** Bentuk bingkai tiap slot foto, berurutan. */
  shapes: PhotoShape[];
  /** Template ini punya kolom judul besar (kategori)? */
  usesTitle: boolean;
  /** Teks default untuk ajakan pesan di bagian bawah. */
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
  red: '#d00000',
  paper: '#efebeb',
  ink: '#111111',
  grey: '#555555',
} as const;

const ORDER_WA = 'BISA ORDER KE NOMOR WA';

export const POSTER_TEMPLATES: PosterTemplateDef[] = [
  {
    id: 'story-grid',
    ratio: '9:16',
    name: 'Grid 4 Foto',
    hint: '4 foto kotak membulat, nama di atas dan bawah',
    kind: 'photos',
    photoSlots: 4,
    shapes: ['squircle', 'squircle', 'squircle', 'squircle'],
    usesTitle: false,
    defaultOrderText: ORDER_WA,
  },
  {
    id: 'story-circles',
    ratio: '9:16',
    name: '3 Foto Bulat',
    hint: '3 foto bulat zig-zag dengan garis penanda',
    kind: 'photos',
    photoSlots: 3,
    shapes: ['circle', 'circle', 'circle'],
    usesTitle: false,
    defaultOrderText: ORDER_WA,
  },
  {
    id: 'story-vertical',
    ratio: '9:16',
    name: 'Judul Vertikal',
    hint: '2 foto, tulisan MENU besar tegak di kiri',
    kind: 'photos',
    photoSlots: 2,
    shapes: ['rounded', 'squircle'],
    usesTitle: false,
    defaultOrderText: ORDER_WA,
  },
  {
    id: 'story-hero',
    ratio: '9:16',
    name: '1 Foto Utama',
    hint: '1 foto bulat besar, nama melengkung di atasnya',
    kind: 'photos',
    photoSlots: 1,
    shapes: ['circle'],
    usesTitle: false,
    defaultOrderText: 'Bisa order ke nomor WA',
  },
  {
    id: 'story-list',
    ratio: '9:16',
    name: 'Daftar Menu',
    hint: 'Tulisan daftar menu dua kolom, tanpa foto',
    kind: 'list',
    photoSlots: 0,
    shapes: [],
    usesTitle: false,
    defaultOrderText: 'Order via WhatsApp',
  },
  {
    id: 'feed-promo',
    ratio: '3:4',
    name: 'Promo Merah',
    hint: '1 foto bulat, kategori besar, nama di label hitam',
    kind: 'photos',
    photoSlots: 1,
    shapes: ['circle'],
    usesTitle: true,
    defaultOrderText: 'ORDER NOW',
  },
  {
    id: 'feed-quad',
    ratio: '3:4',
    name: '4 Foto Beda Bentuk',
    hint: 'Bulat, daun, lengkung, dan kotak membulat',
    kind: 'photos',
    photoSlots: 4,
    shapes: ['circle', 'leaf', 'arch', 'squircle'],
    usesTitle: false,
    defaultOrderText: ORDER_WA,
  },
  {
    id: 'feed-list',
    ratio: '3:4',
    name: 'Daftar Menu',
    hint: 'Bingkai ganda putih, daftar menu dua kolom',
    kind: 'list',
    photoSlots: 0,
    shapes: [],
    usesTitle: false,
    defaultOrderText: 'Order via WhatsApp',
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
}

export interface PosterMenuSection {
  /** Nama label/kategori menu (kosong untuk bagian tanpa label di awal). */
  label: string;
  items: string[];
  /** 'full' = 2 kolom dengan judul terpusat, 'half' = 1 kolom bersandingan, 'auto' = otomatis berdasarkan jumlah */
  layout?: 'auto' | 'full' | 'half';
}

export interface PosterContent {
  brand: string;
  subtitle: string;
  /** Baris kecil di bawah judul, mis. "SINCE 2002". Boleh kosong. */
  since: string;
  /** Judul kategori besar (template Promo). */
  title: string;
  orderText: string;
  phone: string;
  slots: PosterSlot[];
  listItems: string[];
  /** Daftar menu terkelompok berdasarkan label/kategori. */
  sections?: PosterMenuSection[];
  /** URI logo kustom yang dipilih pengguna untuk poster ini. */
  logoUri?: string;
}

export const MAX_PHOTO_SLOTS = 4;

export function emptySlots(): PosterSlot[] {
  return Array.from({ length: MAX_PHOTO_SLOTS }, () => ({ caption: '' }));
}

/** 0813 4495 6336 -> 0813-4495-6336 */
export function phoneWithDashes(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 9) return phone;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}
