export type Coordinates = {
  latitude: number;
  longitude: number;
};

/** Field umum untuk semua record yang disinkronkan ke Firebase. */
export interface Syncable {
  id: string;
  /** Dasar resolusi konflik: record dengan updated_at terbesar menang (last-write-wins). */
  updated_at: number;
  /** Soft delete. Record masuk Tempat Sampah (Space) selama 7 hari. */
  deleted_at?: number;
  /** Dihapus permanen oleh pengguna; disembunyikan di mana pun lalu dibersihkan fisik. */
  purged?: boolean;
}

export interface StoreProfile {
  store_name: string;
  phone_number: string;
  origin_address: string;
  origin_coordinates: Coordinates | null;
  /** Daftar nama label kategori menu yang dibuat pengguna. */
  menu_labels?: string[];
  created_at: number;
  updated_at: number;
}

export interface Customer extends Syncable {
  name: string;
  whatsapp_number: string;
  address_text: string;
  landmark: string;
  maps_url: string;
  coordinates: Coordinates | null;
}

export interface MenuItem extends Syncable {
  title: string;
  price: number;
  is_active: boolean;
  /** Naik setiap foto diganti. Berkas gambar disimpan lokal per perangkat. */
  image_version?: number;
  /** Label kategori menu, mis. "SIDE DISH", "MIE", "SNACK & DESSERT". */
  label?: string;
}

/** MenuItem + path berkas gambar lokal (khusus perangkat ini, tidak ikut ke Firebase). */
export type MenuItemView = MenuItem & { image_uri?: string };

export type DeliverySlot = 'Pagi' | 'Siang';
export type DeliveryMethod = 'SELF_COURIER' | 'GOSEND' | 'GRAB';
export type OrderStatus = 'PENDING' | 'READY_FOR_DELIVERY' | 'COMPLETED';

export interface OrderItem {
  menu_id: string;
  /** Salinan nama menu saat pesanan dibuat, agar riwayat tetap terbaca bila menu dihapus. */
  title: string;
  quantity: number;
  unit_price: number;
}

export interface Order extends Syncable {
  /**
   * 'DELIVERY' = titik antar saja (Mode Kurir), tanpa menu dan tanpa total.
   * Kosong / 'ORDER' = pesanan biasa. Data lama otomatis dianggap pesanan biasa.
   */
  kind?: 'ORDER' | 'DELIVERY';
  customer_id: string;
  /** Format YYYY-MM-DD (zona waktu perangkat). */
  delivery_date: string;
  delivery_slot: DeliverySlot;
  /** HH:MM. Kosong = tidak ada catatan waktu. */
  delivery_time: string;
  /** Keterangan waktu opsional (mis. "Tunggu toko buka"). Hanya ada bila jam aktif. */
  time_note?: string;
  items: OrderItem[];
  note: string;
  total_amount: number;
  delivery_method: DeliveryMethod;
  status: OrderStatus;
  is_paid: boolean;
  created_at: number;
  completed_at?: number;
}

/** Draf pesanan di layar Tambah, belum masuk database. */
export interface DraftOrder {
  id: string;
  customer_id: string;
  quantities: Record<string, number>;
  /** Catatan waktu aktif? Jam terakhir tetap diingat walau nonaktif. */
  timeOn: boolean;
  /** HH:MM */
  time: string;
  /** Keterangan waktu (opsional). */
  timeNote: string;
  note: string;
}

export interface StoreSession {
  store_key: string;
  store_name: string;
}

/** Poster hanya disimpan lokal (berkas gambar), tidak disinkronkan. */
export interface PosterRecord {
  id: string;
  uri: string;
  title: string;
  /** Rasio poster saat dibuat; poster lama tanpa field ini dianggap 3:4. */
  ratio?: '9:16' | '3:4';
  created_at: number;
}

/** Logo toko disimpan lokal per perangkat untuk poster / postingan. */
export interface StoreLogo {
  id: string;
  /** Nama / kegunaan logo, mis. "Logo Utama", "Logo Menu", "Logo Promo". */
  name: string;
  uri: string;
  created_at: number;
}

export type MenuImageMap = Record<string, { uri: string; version: number }>;

export type CollectionName = 'customers' | 'menu_items' | 'orders';

export interface CollectionMap {
  customers: Customer;
  menu_items: MenuItem;
  orders: Order;
}

export type RecordMaps = { [N in CollectionName]: Record<string, CollectionMap[N]> };

export interface BackupFile {
  app: 'MJ Mama Jualan';
  version: 2;
  exported_at: number;
  store_key: string;
  profile: StoreProfile | null;
  customers: Record<string, Customer>;
  menu_items: Record<string, MenuItem>;
  orders: Record<string, Order>;
  logos?: StoreLogo[];
}
