import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import {
  get,
  getDatabase,
  onChildAdded,
  onChildChanged,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  type Database,
} from 'firebase/database';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';
import type {
  CollectionMap,
  CollectionName,
  Customer,
  MenuItem,
  Order,
  StoreProfile,
} from '../types';

export { isFirebaseConfigured };

export class SyncError extends Error {
  constructor(public code: 'NOT_CONFIGURED' | 'OFFLINE' | 'NOT_FOUND' | 'DENIED' | 'UNKNOWN', message: string) {
    super(message);
  }
}

let cached: { app: FirebaseApp; auth: Auth; db: Database } | null = null;

function services() {
  if (!isFirebaseConfigured()) {
    throw new SyncError('NOT_CONFIGURED', 'Firebase belum dikonfigurasi. Isi file .env terlebih dulu.');
  }
  if (cached) return cached;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  let auth: Auth;
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // initializeAuth hanya boleh dipanggil sekali (mis. setelah Fast Refresh)
    auth = getAuth(app);
  }
  cached = { app, auth, db: getDatabase(app) };
  return cached;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new SyncError('OFFLINE', 'Tidak ada koneksi internet. Coba lagi saat online.')),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function mapError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/permission[_ ]denied/i.test(message)) {
    return new SyncError('DENIED', 'Akses ditolak Firebase. Pastikan Rules sudah di-Publish dan Anonymous Auth aktif.');
  }
  if (/network|offline/i.test(message)) {
    return new SyncError('OFFLINE', 'Tidak ada koneksi internet. Coba lagi saat online.');
  }
  return new SyncError('UNKNOWN', message);
}

/** Login anonim (tanpa form). Sesi dipulihkan dari AsyncStorage pada pembukaan berikutnya. */
export async function ensureAuth(): Promise<string> {
  const { auth } = services();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const credential = await withTimeout(signInAnonymously(auth), 12000);
    return credential.user.uid;
  } catch (error) {
    throw mapError(error);
  }
}

const storePath = (key: string) => `stores/${key}`;

/** HP pertama: daftarkan perangkat sebagai anggota lalu tulis profil toko. */
export async function createRemoteStore(key: string, profile: StoreProfile): Promise<void> {
  try {
    const uid = await ensureAuth();
    const { db } = services();
    await withTimeout(set(ref(db, `${storePath(key)}/members/${uid}`), true), 12000);
    await withTimeout(set(ref(db, `${storePath(key)}/profile`), stripUndefined(profile)), 12000);
  } catch (error) {
    throw mapError(error);
  }
}

/** HP kedua: gabung memakai Kode Toko. Gagal bila kode tidak ada. */
export async function joinRemoteStore(key: string): Promise<StoreProfile> {
  try {
    const uid = await ensureAuth();
    const { db } = services();
    const memberRef = ref(db, `${storePath(key)}/members/${uid}`);
    await withTimeout(set(memberRef, true), 12000);
    const snapshot = await withTimeout(get(ref(db, `${storePath(key)}/profile`)), 12000);
    if (!snapshot.exists()) {
      await remove(memberRef).catch(() => undefined);
      throw new SyncError('NOT_FOUND', 'Kode toko tidak ditemukan. Periksa kembali kodenya.');
    }
    return normalizeProfile(snapshot.val());
  } catch (error) {
    throw mapError(error);
  }
}

export interface RemoteImage {
  data: string;
  version: number;
}

export interface SyncHandlers {
  onProfile: (profile: StoreProfile | null) => void;
  onCustomers: (records: Record<string, Customer>) => void;
  onMenu: (records: Record<string, MenuItem>) => void;
  onOrders: (records: Record<string, Order>) => void;
  onImage: (menuId: string, image: RemoteImage) => void;
  onPresence: (activeDevices: number) => void;
  onConnection: (online: boolean) => void;
  onError: (message: string) => void;
}

/** Berlangganan semua node toko. Mengembalikan fungsi untuk berhenti. */
export async function subscribeStore(key: string, handlers: SyncHandlers): Promise<() => void> {
  const uid = await ensureAuth();
  const { db } = services();
  const base = storePath(key);

  // Daftarkan perangkat ini sebagai anggota (idempotent). Tanpa ini, listener ditolak rules
  // pada toko yang dibuat saat mode lokal, atau setelah login anonim berganti uid
  // (data aplikasi dihapus / instal ulang). Kode toko di sesi = bukti boleh masuk.
  try {
    await withTimeout(set(ref(db, `${base}/members/${uid}`), true), 12000);
  } catch (error) {
    throw mapError(error);
  }
  const stops: (() => void)[] = [];
  const fail = (error: Error) => handlers.onError(mapError(error).message);
  const presenceRef = ref(db, `${base}/presence/${uid}`);

  stops.push(
    onValue(ref(db, '.info/connected'), (snapshot) => {
      const online = snapshot.val() === true;
      handlers.onConnection(online);
      if (online) {
        onDisconnect(presenceRef)
          .remove()
          .then(() => set(presenceRef, true))
          .catch(() => undefined);
      }
    }),
  );
  stops.push(
    onValue(
      ref(db, `${base}/profile`),
      (snapshot) => handlers.onProfile(snapshot.exists() ? normalizeProfile(snapshot.val()) : null),
      fail,
    ),
  );
  stops.push(
    onValue(
      ref(db, `${base}/customers`),
      (snapshot) => handlers.onCustomers(normalizeMap(snapshot.val(), normalizeCustomer)),
      fail,
    ),
  );
  stops.push(
    onValue(
      ref(db, `${base}/menu_items`),
      (snapshot) => handlers.onMenu(normalizeMap(snapshot.val(), normalizeMenu)),
      fail,
    ),
  );
  stops.push(
    onValue(
      ref(db, `${base}/orders`),
      (snapshot) => handlers.onOrders(normalizeMap(snapshot.val(), normalizeOrder)),
      fail,
    ),
  );
  stops.push(onValue(ref(db, `${base}/presence`), (snapshot) => handlers.onPresence(snapshot.size)));

  const imageHandler = (snapshot: { key: string | null; val: () => unknown }) => {
    const value = snapshot.val() as Partial<RemoteImage> | null;
    if (snapshot.key && value && typeof value.data === 'string') {
      handlers.onImage(snapshot.key, { data: value.data, version: Number(value.version) || 0 });
    }
  };
  stops.push(onChildAdded(ref(db, `${base}/menu_images`), imageHandler, fail));
  stops.push(onChildChanged(ref(db, `${base}/menu_images`), imageHandler, fail));

  return () => {
    stops.forEach((stop) => stop());
    remove(presenceRef).catch(() => undefined);
  };
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function guarded<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw mapError(error);
  }
}

/** Dorong satu record. Saat offline, Promise baru selesai ketika koneksi kembali. */
export function pushRecord<N extends CollectionName>(
  key: string,
  name: N,
  record: CollectionMap[N],
): Promise<void> {
  return guarded(async () => {
    const { db } = services();
    await ensureAuth();
    await set(ref(db, `${storePath(key)}/${name}/${record.id}`), stripUndefined(record));
  });
}

export function removeRecord(key: string, name: CollectionName, id: string): Promise<void> {
  return guarded(async () => {
    const { db } = services();
    await ensureAuth();
    await remove(ref(db, `${storePath(key)}/${name}/${id}`));
  });
}

export function pushProfile(key: string, profile: StoreProfile): Promise<void> {
  return guarded(async () => {
    const { db } = services();
    await ensureAuth();
    await set(ref(db, `${storePath(key)}/profile`), stripUndefined(profile));
  });
}

export function pushMenuImage(key: string, menuId: string, image: RemoteImage): Promise<void> {
  return guarded(async () => {
    const { db } = services();
    await ensureAuth();
    await set(ref(db, `${storePath(key)}/menu_images/${menuId}`), image);
  });
}

export function removeMenuImage(key: string, menuId: string): Promise<void> {
  return guarded(async () => {
    const { db } = services();
    await ensureAuth();
    await remove(ref(db, `${storePath(key)}/menu_images/${menuId}`));
  });
}

// ---------------------------------------------------------------------------
// Normalisasi: Realtime Database membuang nilai null/array kosong, jadi data dari
// remote diberi nilai default sebelum dipakai aplikasi.
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback);

function coords(value: unknown): { latitude: number; longitude: number } | null {
  const v = value as Raw | null | undefined;
  if (v && typeof v.latitude === 'number' && typeof v.longitude === 'number') {
    return { latitude: v.latitude, longitude: v.longitude };
  }
  return null;
}

function normalizeMap<T>(value: unknown, fn: (raw: Raw, id: string) => T): Record<string, T> {
  const out: Record<string, T> = {};
  if (value && typeof value === 'object') {
    for (const [id, raw] of Object.entries(value as Raw)) {
      if (raw && typeof raw === 'object') out[id] = fn(raw as Raw, id);
    }
  }
  return out;
}

function syncFields(raw: Raw, id: string) {
  return {
    id: str(raw.id, id),
    updated_at: num(raw.updated_at),
    ...(typeof raw.deleted_at === 'number' ? { deleted_at: raw.deleted_at } : {}),
    ...(raw.purged === true ? { purged: true } : {}),
  };
}

function normalizeProfile(value: unknown): StoreProfile {
  const raw = (value ?? {}) as Raw;
  const labelsRaw = Array.isArray(raw.menu_labels)
    ? (raw.menu_labels as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  return {
    store_name: str(raw.store_name, 'Toko Mama'),
    phone_number: str(raw.phone_number),
    origin_address: str(raw.origin_address),
    origin_coordinates: coords(raw.origin_coordinates),
    ...(labelsRaw ? { menu_labels: labelsRaw } : {}),
    created_at: num(raw.created_at),
    updated_at: num(raw.updated_at),
  };
}

function normalizeCustomer(raw: Raw, id: string): Customer {
  return {
    ...syncFields(raw, id),
    name: str(raw.name),
    whatsapp_number: str(raw.whatsapp_number),
    address_text: str(raw.address_text),
    landmark: str(raw.landmark),
    maps_url: str(raw.maps_url),
    coordinates: coords(raw.coordinates),
  };
}

function normalizeMenu(raw: Raw, id: string): MenuItem {
  return {
    ...syncFields(raw, id),
    title: str(raw.title),
    price: num(raw.price),
    is_active: raw.is_active !== false,
    ...(typeof raw.image_version === 'number' ? { image_version: raw.image_version } : {}),
    ...(typeof raw.label === 'string' && raw.label.trim() ? { label: raw.label.trim() } : {}),
  };
}

function normalizeOrder(raw: Raw, id: string): Order {
  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : raw.items && typeof raw.items === 'object'
      ? Object.values(raw.items as Raw)
      : [];
  return {
    ...syncFields(raw, id),
    ...(raw.kind === 'DELIVERY' ? { kind: 'DELIVERY' as const } : {}),
    customer_id: str(raw.customer_id),
    delivery_date: str(raw.delivery_date),
    delivery_slot: raw.delivery_slot === 'Siang' ? 'Siang' : 'Pagi',
    delivery_time: str(raw.delivery_time),
    ...(typeof raw.time_note === 'string' && raw.time_note ? { time_note: raw.time_note } : {}),
    items: (itemsRaw as Raw[]).map((item) => ({
      menu_id: str(item.menu_id),
      title: str(item.title, 'Menu'),
      quantity: num(item.quantity),
      unit_price: num(item.unit_price),
    })),
    note: str(raw.note),
    total_amount: num(raw.total_amount),
    delivery_method:
      raw.delivery_method === 'GOSEND' || raw.delivery_method === 'GRAB' ? raw.delivery_method : 'SELF_COURIER',
    status:
      raw.status === 'COMPLETED' || raw.status === 'READY_FOR_DELIVERY' ? raw.status : 'PENDING',
    is_paid: raw.is_paid === true,
    created_at: num(raw.created_at),
    ...(typeof raw.completed_at === 'number' ? { completed_at: raw.completed_at } : {}),
  };
}
