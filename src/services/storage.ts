import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BackupFile,
  CollectionMap,
  CollectionName,
  MenuImageMap,
  PosterRecord,
  RecordMaps,
  StoreLogo,
  StoreProfile,
  StoreSession,
} from '../types';

const KEYS = {
  session: 'mj:session',
  posters: 'mj:posters',
  profile: (storeKey: string) => `mj:${storeKey}:profile`,
  collection: (storeKey: string, name: CollectionName) => `mj:${storeKey}:${name}`,
  images: (storeKey: string) => `mj:${storeKey}:menu-images`,
  logos: (storeKey: string) => `mj:${storeKey}:logos`,
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[storage] gagal menulis', key, error);
  }
}

export const loadSession = () => readJSON<StoreSession | null>(KEYS.session, null);
export const saveSession = (session: StoreSession) => writeJSON(KEYS.session, session);
export const clearSession = () => AsyncStorage.removeItem(KEYS.session);

export const loadProfile = (storeKey: string) =>
  readJSON<StoreProfile | null>(KEYS.profile(storeKey), null);
export const saveProfile = (storeKey: string, profile: StoreProfile) =>
  writeJSON(KEYS.profile(storeKey), profile);

export function loadCollection<N extends CollectionName>(
  storeKey: string,
  name: N,
): Promise<Record<string, CollectionMap[N]>> {
  return readJSON<Record<string, CollectionMap[N]>>(KEYS.collection(storeKey, name), {});
}

export function saveCollection<N extends CollectionName>(
  storeKey: string,
  name: N,
  records: Record<string, CollectionMap[N]>,
): Promise<void> {
  return writeJSON(KEYS.collection(storeKey, name), records);
}

export async function loadAllCollections(storeKey: string): Promise<RecordMaps> {
  const [customers, menu_items, orders] = await Promise.all([
    loadCollection(storeKey, 'customers'),
    loadCollection(storeKey, 'menu_items'),
    loadCollection(storeKey, 'orders'),
  ]);
  return { customers, menu_items, orders };
}

export const loadMenuImages = (storeKey: string) =>
  readJSON<MenuImageMap>(KEYS.images(storeKey), {});
export const saveMenuImages = (storeKey: string, map: MenuImageMap) =>
  writeJSON(KEYS.images(storeKey), map);

export const loadPosters = () => readJSON<PosterRecord[]>(KEYS.posters, []);
export const savePosters = (posters: PosterRecord[]) => writeJSON(KEYS.posters, posters);

export const loadLogos = (storeKey: string) => readJSON<StoreLogo[]>(KEYS.logos(storeKey), []);
export const saveLogos = (storeKey: string, logos: StoreLogo[]) => writeJSON(KEYS.logos(storeKey), logos);

export async function buildBackup(storeKey: string): Promise<BackupFile> {
  const [profile, collections, logos] = await Promise.all([
    loadProfile(storeKey),
    loadAllCollections(storeKey),
    loadLogos(storeKey),
  ]);
  return {
    app: 'MJ Mama Jualan',
    version: 2,
    exported_at: Date.now(),
    store_key: storeKey,
    profile,
    customers: collections.customers,
    menu_items: collections.menu_items,
    orders: collections.orders,
    logos,
  };
}
