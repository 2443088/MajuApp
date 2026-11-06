import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  SyncError,
  createRemoteStore,
  isFirebaseConfigured,
  joinRemoteStore,
  pushMenuImage,
  pushProfile,
  pushRecord,
  removeMenuImage,
  removeRecord,
  subscribeStore,
  type RemoteImage,
  type SyncHandlers,
} from '../services/firebaseSync';
import { removeFile, saveLogoFile, savePosterFile, saveSyncedImage, type PreparedPhoto } from '../services/imageService';
import {
  clearSession,
  loadAllCollections,
  loadLogos,
  loadMenuImages,
  loadPosters,
  loadProfile,
  loadSession,
  saveCollection,
  saveLogos,
  saveMenuImages,
  saveProfile as persistProfile,
  savePosters,
  saveSession,
} from '../services/storage';
import type {
  CollectionMap,
  CollectionName,
  Coordinates,
  Customer,
  DraftOrder,
  MenuImageMap,
  MenuItem,
  MenuItemView,
  Order,
  OrderStatus,
  PosterRecord,
  RecordMaps,
  StoreLogo,
  StoreProfile,
  StoreSession,
} from '../types';
import { DAY_MS, RETENTION_DAYS, isValidStoreKey, makeId, makeOrderId, makeStoreKey, normalizeStoreKey } from '../utils/format';
import { isHidden, isInTrash, mergeRecords } from '../utils/merge';

const EMPTY_MAPS: RecordMaps = { customers: {}, menu_items: {}, orders: {} };

export interface CustomerInput {
  id?: string;
  name: string;
  whatsapp_number: string;
  address_text: string;
  landmark: string;
  maps_url: string;
  coordinates: Coordinates | null;
}

export interface MenuInput {
  id: string;
  title: string;
  price: number;
  is_active: boolean;
  label?: string;
  /** Foto baru hasil pickMenuPhoto; undefined = foto tidak diubah. */
  photo?: PreparedPhoto;
}

export interface ProfileInput {
  store_name: string;
  phone_number: string;
  origin_address: string;
  origin_coordinates: Coordinates | null;
}

interface StoreContextValue {
  ready: boolean;
  session: StoreSession | null;
  profile: StoreProfile | null;
  online: boolean;
  syncEnabled: boolean;
  syncError: string | null;
  activeDevices: number;

  customers: Customer[];
  menu: MenuItemView[];
  orders: Order[];
  allCustomers: Record<string, Customer>;
  allMenu: Record<string, MenuItemView>;
  trashOrders: Order[];
  trashCustomers: Customer[];
  trashMenu: MenuItemView[];
  posters: PosterRecord[];
  labels: string[];
  logos: StoreLogo[];

  createStore: (storeName: string) => Promise<void>;
  joinStore: (code: string) => Promise<void>;
  leaveStore: () => Promise<void>;
  saveStoreProfile: (input: ProfileInput) => void;

  saveCustomer: (input: CustomerInput) => Customer;
  saveMenuItem: (input: MenuInput) => MenuItem;
  setMenuActive: (id: string, active: boolean) => void;

  addLabel: (name: string) => void;
  renameLabel: (oldName: string, newName: string) => void;
  deleteLabel: (name: string) => void;
  moveMenuItemsToLabel: (menuIds: string[], targetLabel?: string) => void;

  saveLogo: (name: string, tempUri: string) => Promise<StoreLogo>;
  deleteLogo: (id: string) => Promise<void>;
  updateLogoName: (id: string, name: string) => Promise<void>;

  addOrders: (drafts: DraftOrder[], deliveryDate: string) => number;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  toggleOrderPaid: (id: string) => void;

  moveToTrash: (name: CollectionName, id: string) => void;
  restoreFromTrash: (name: CollectionName, id: string) => void;
  deletePermanently: (name: CollectionName, id: string) => void;

  savePoster: (tempUri: string, title: string, ratio: '9:16' | '3:4') => Promise<PosterRecord>;
  deletePoster: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StoreSession | null>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [maps, setMaps] = useState<RecordMaps>(EMPTY_MAPS);
  const [images, setImages] = useState<MenuImageMap>({});
  const [posters, setPosters] = useState<PosterRecord[]>([]);
  const [logos, setLogos] = useState<StoreLogo[]>([]);
  const [online, setOnline] = useState(false);
  const [activeDevices, setActiveDevices] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Ref = sumber kebenaran yang selalu terbaru untuk callback Firebase (tanpa closure basi).
  const sessionRef = useRef<StoreSession | null>(null);
  const profileRef = useRef<StoreProfile | null>(null);
  const mapsRef = useRef<RecordMaps>(EMPTY_MAPS);
  const imagesRef = useRef<MenuImageMap>({});
  const postersRef = useRef<PosterRecord[]>([]);
  const logosRef = useRef<StoreLogo[]>([]);

  const syncEnabled = isFirebaseConfigured();

  // ---------------------------------------------------------------- commit helpers
  const commitMap = useCallback(<N extends CollectionName>(name: N, next: RecordMaps[N]) => {
    mapsRef.current = { ...mapsRef.current, [name]: next } as RecordMaps;
    setMaps(mapsRef.current);
    const key = sessionRef.current?.store_key;
    if (key) void saveCollection(key, name, next);
  }, []);

  const commitImages = useCallback((next: MenuImageMap) => {
    imagesRef.current = next;
    setImages(next);
    const key = sessionRef.current?.store_key;
    if (key) void saveMenuImages(key, next);
  }, []);

  const commitProfile = useCallback((next: StoreProfile) => {
    profileRef.current = next;
    setProfile(next);
    const current = sessionRef.current;
    if (current) {
      void persistProfile(current.store_key, next);
      if (current.store_name !== next.store_name) {
        const updated = { ...current, store_name: next.store_name };
        sessionRef.current = updated;
        setSession(updated);
        void saveSession(updated);
      }
    }
  }, []);

  const commitPosters = useCallback((next: PosterRecord[]) => {
    postersRef.current = next;
    setPosters(next);
    void savePosters(next);
  }, []);

  const commitLogos = useCallback((next: StoreLogo[]) => {
    logosRef.current = next;
    setLogos(next);
    const key = sessionRef.current?.store_key;
    if (key) void saveLogos(key, next);
  }, []);

  const reportError = useCallback((error: unknown) => setSyncError(errorMessage(error)), []);

  const push = useCallback(
    <N extends CollectionName>(name: N, record: CollectionMap[N]) => {
      const key = sessionRef.current?.store_key;
      if (!key || !isFirebaseConfigured()) return;
      pushRecord(key, name, record).then(() => setSyncError(null), reportError);
    },
    [reportError],
  );

  /** Tulis lokal dulu (instan, bekerja offline), lalu dorong ke Firebase. */
  const putRecord = useCallback(
    <N extends CollectionName>(name: N, record: CollectionMap[N]): CollectionMap[N] => {
      const current = mapsRef.current[name] as Record<string, CollectionMap[N]>;
      const previous = current[record.id];
      const stamped = {
        ...record,
        updated_at: Math.max(Date.now(), (previous?.updated_at ?? 0) + 1),
      } as CollectionMap[N];
      commitMap(name, { ...current, [record.id]: stamped } as RecordMaps[N]);
      push(name, stamped);
      return stamped;
    },
    [commitMap, push],
  );

  // ---------------------------------------------------------------- remote -> local
  const applyRemote = useCallback(
    <N extends CollectionName>(name: N, remote: Record<string, CollectionMap[N]>) => {
      const local = mapsRef.current[name] as Record<string, CollectionMap[N]>;
      const { merged, toPush, changed } = mergeRecords(local, remote);
      if (changed) commitMap(name, merged as RecordMaps[N]);
      toPush.forEach((record) => push(name, record));
    },
    [commitMap, push],
  );

  const applyRemoteProfile = useCallback(
    (remote: StoreProfile | null) => {
      const local = profileRef.current;
      if (!remote) {
        const key = sessionRef.current?.store_key;
        if (local && key) pushProfile(key, local).catch(reportError);
        return;
      }
      if (!local || remote.updated_at >= local.updated_at) {
        if (!local || remote.updated_at !== local.updated_at) commitProfile(remote);
      } else {
        const key = sessionRef.current?.store_key;
        if (key) pushProfile(key, local).catch(reportError);
      }
    },
    [commitProfile, reportError],
  );

  const applyRemoteImage = useCallback(
    async (menuId: string, image: RemoteImage) => {
      const known = imagesRef.current[menuId];
      if (known && known.version >= image.version) return;
      try {
        const uri = await saveSyncedImage(menuId, image.version, image.data);
        const latest = imagesRef.current[menuId];
        if (latest && latest.version >= image.version) {
          await removeFile(uri);
          return;
        }
        if (latest && latest.uri !== uri) await removeFile(latest.uri);
        commitImages({ ...imagesRef.current, [menuId]: { uri, version: image.version } });
      } catch (error) {
        reportError(error);
      }
    },
    [commitImages, reportError],
  );

  // ---------------------------------------------------------------- hydrate / boot
  const hydrate = useCallback(async (next: StoreSession) => {
    const [storedProfile, storedMaps, storedImages, storedLogos] = await Promise.all([
      loadProfile(next.store_key),
      loadAllCollections(next.store_key),
      loadMenuImages(next.store_key),
      loadLogos(next.store_key),
    ]);
    sessionRef.current = next;
    profileRef.current = storedProfile;
    mapsRef.current = storedMaps;
    imagesRef.current = storedImages;
    logosRef.current = storedLogos;
    setSession(next);
    setProfile(storedProfile);
    setMaps(storedMaps);
    setImages(storedImages);
    setLogos(storedLogos);
  }, []);

  const resetMemory = useCallback(() => {
    sessionRef.current = null;
    profileRef.current = null;
    mapsRef.current = EMPTY_MAPS;
    imagesRef.current = {};
    logosRef.current = [];
    setSession(null);
    setProfile(null);
    setMaps(EMPTY_MAPS);
    setImages({});
    setLogos([]);
    setOnline(false);
    setActiveDevices(0);
    setSyncError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, storedPosters] = await Promise.all([loadSession(), loadPosters()]);
      if (cancelled) return;
      postersRef.current = storedPosters;
      setPosters(storedPosters);
      if (stored) await hydrate(stored);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // ---------------------------------------------------------------- live sync
  const storeKey = session?.store_key ?? null;

  useEffect(() => {
    if (!storeKey || !isFirebaseConfigured()) return undefined;
    let cancelled = false;
    let stop: (() => void) | undefined;

    const handlers: SyncHandlers = {
      onProfile: applyRemoteProfile,
      onCustomers: (records) => applyRemote('customers', records),
      onMenu: (records) => applyRemote('menu_items', records),
      onOrders: (records) => applyRemote('orders', records),
      onImage: (menuId, image) => void applyRemoteImage(menuId, image),
      onPresence: setActiveDevices,
      onConnection: setOnline,
      onError: setSyncError,
    };

    subscribeStore(storeKey, handlers).then(
      (unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      },
      (error) => {
        if (!cancelled) reportError(error);
      },
    );

    return () => {
      cancelled = true;
      stop?.();
      setOnline(false);
      setActiveDevices(0);
    };
  }, [storeKey, applyRemote, applyRemoteProfile, applyRemoteImage, reportError]);

  // ---------------------------------------------------------------- retention (7 hari)
  const purgeExpired = useCallback(() => {
    const now = Date.now();
    const limit = RETENTION_DAYS * DAY_MS;
    const key = sessionRef.current?.store_key;

    (['customers', 'menu_items', 'orders'] as const).forEach((name) => {
      const current = mapsRef.current[name] as Record<string, CollectionMap[typeof name]>;
      const next: Record<string, CollectionMap[typeof name]> = {};
      let removed = false;
      Object.values(current).forEach((record) => {
        const expiredTrash = record.deleted_at !== undefined && now - record.deleted_at > limit;
        const expiredPurge = record.purged === true && now - record.updated_at > limit;
        if (expiredTrash || expiredPurge) {
          removed = true;
          if (key && isFirebaseConfigured()) removeRecord(key, name, record.id).catch(reportError);
          if (name === 'menu_items') {
            const image = imagesRef.current[record.id];
            if (image) {
              void removeFile(image.uri);
              const { [record.id]: _gone, ...rest } = imagesRef.current;
              commitImages(rest);
              if (key && isFirebaseConfigured()) removeMenuImage(key, record.id).catch(reportError);
            }
          }
        } else {
          next[record.id] = record;
        }
      });
      if (removed) commitMap(name, next as RecordMaps[typeof name]);
    });

    const keep = postersRef.current.filter((poster) => now - poster.created_at <= limit);
    if (keep.length !== postersRef.current.length) {
      postersRef.current.filter((p) => !keep.includes(p)).forEach((p) => void removeFile(p.uri));
      commitPosters(keep);
    }
  }, [commitImages, commitMap, commitPosters, reportError]);

  useEffect(() => {
    if (!ready) return undefined;
    const first = setTimeout(purgeExpired, 3000);
    const interval = setInterval(purgeExpired, 6 * 60 * 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') purgeExpired();
    });
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      subscription.remove();
    };
  }, [ready, purgeExpired]);

  // ---------------------------------------------------------------- session actions
  const createStore = useCallback(
    async (storeName: string) => {
      const name = storeName.trim();
      if (!name) throw new Error('Nama toko wajib diisi.');
      const now = Date.now();
      const key = makeStoreKey();
      const newProfile: StoreProfile = {
        store_name: name,
        phone_number: '',
        origin_address: '',
        origin_coordinates: null,
        created_at: now,
        updated_at: now,
      };
      if (isFirebaseConfigured()) await createRemoteStore(key, newProfile);
      const next: StoreSession = { store_key: key, store_name: name };
      await saveSession(next);
      await persistProfile(key, newProfile);
      await hydrate(next);
    },
    [hydrate],
  );

  const joinStore = useCallback(
    async (code: string) => {
      const key = normalizeStoreKey(code);
      if (!isValidStoreKey(key)) {
        throw new Error('Format kode toko tidak valid. Contoh: MJ-7K4Q9X');
      }
      if (!isFirebaseConfigured()) {
        throw new SyncError('NOT_CONFIGURED', 'Menghubungkan ke toko lain butuh Firebase. Isi file .env dulu.');
      }
      const remoteProfile = await joinRemoteStore(key);
      const next: StoreSession = { store_key: key, store_name: remoteProfile.store_name };
      await saveSession(next);
      await persistProfile(key, remoteProfile);
      await hydrate(next);
    },
    [hydrate],
  );

  const leaveStore = useCallback(async () => {
    await clearSession();
    resetMemory();
  }, [resetMemory]);

  const saveStoreProfile = useCallback(
    (input: ProfileInput) => {
      const current = profileRef.current;
      const now = Date.now();
      const next: StoreProfile = {
        created_at: current?.created_at ?? now,
        ...input,
        store_name: input.store_name.trim() || current?.store_name || 'Toko Mama',
        updated_at: Math.max(now, (current?.updated_at ?? 0) + 1),
      };
      commitProfile(next);
      const key = sessionRef.current?.store_key;
      if (key && isFirebaseConfigured()) pushProfile(key, next).catch(reportError);
    },
    [commitProfile, reportError],
  );

  // ---------------------------------------------------------------- customers & menu
  const saveCustomer = useCallback(
    (input: CustomerInput): Customer => {
      const existing = input.id ? mapsRef.current.customers[input.id] : undefined;
      const record: Customer = {
        ...(existing ?? { updated_at: 0 }),
        id: existing?.id ?? makeId('CUST'),
        name: input.name.trim(),
        whatsapp_number: input.whatsapp_number,
        address_text: input.address_text.trim(),
        landmark: input.landmark.trim(),
        maps_url: input.maps_url.trim(),
        coordinates: input.coordinates,
      };
      return putRecord('customers', record);
    },
    [putRecord],
  );

  const addLabel = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const currentLabels = profileRef.current?.menu_labels ?? [];
      if (currentLabels.includes(trimmed)) return;
      const nextLabels = [...currentLabels, trimmed];
      const current = profileRef.current;
      const updated: StoreProfile = current
        ? { ...current, menu_labels: nextLabels, updated_at: Date.now() }
        : {
            store_name: sessionRef.current?.store_name ?? 'Toko Mama',
            phone_number: '',
            origin_address: '',
            origin_coordinates: null,
            menu_labels: nextLabels,
            created_at: Date.now(),
            updated_at: Date.now(),
          };
      commitProfile(updated);
      const key = sessionRef.current?.store_key;
      if (key && isFirebaseConfigured()) pushProfile(key, updated).catch(reportError);
    },
    [commitProfile, reportError],
  );

  const renameLabel = useCallback(
    (oldName: string, newName: string) => {
      const trimmedOld = oldName.trim();
      const trimmedNew = newName.trim();
      if (!trimmedNew || trimmedOld === trimmedNew) return;

      const currentLabels = profileRef.current?.menu_labels ?? [];
      const nextLabels = currentLabels.map((lbl) => (lbl === trimmedOld ? trimmedNew : lbl));
      if (!nextLabels.includes(trimmedNew)) nextLabels.push(trimmedNew);
      const currentProfile = profileRef.current;
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, menu_labels: nextLabels, updated_at: Date.now() };
        commitProfile(updatedProfile);
        const key = sessionRef.current?.store_key;
        if (key && isFirebaseConfigured()) pushProfile(key, updatedProfile).catch(reportError);
      }

      const currentMenu = mapsRef.current.menu_items;
      let menuChanged = false;
      const nextMenuItems = { ...currentMenu };
      const now = Date.now();
      Object.values(currentMenu).forEach((item) => {
        if (item.label === trimmedOld) {
          nextMenuItems[item.id] = { ...item, label: trimmedNew, updated_at: now };
          menuChanged = true;
          push('menu_items', nextMenuItems[item.id]);
        }
      });
      if (menuChanged) {
        commitMap('menu_items', nextMenuItems);
      }
    },
    [commitMap, commitProfile, push, reportError],
  );

  const deleteLabel = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      const currentLabels = profileRef.current?.menu_labels ?? [];
      const nextLabels = currentLabels.filter((lbl) => lbl !== trimmed);
      const currentProfile = profileRef.current;
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, menu_labels: nextLabels, updated_at: Date.now() };
        commitProfile(updatedProfile);
        const key = sessionRef.current?.store_key;
        if (key && isFirebaseConfigured()) pushProfile(key, updatedProfile).catch(reportError);
      }

      const currentMenu = mapsRef.current.menu_items;
      let menuChanged = false;
      const nextMenuItems = { ...currentMenu };
      const now = Date.now();
      Object.values(currentMenu).forEach((item) => {
        if (item.label === trimmed) {
          const updated = { ...item, updated_at: now };
          delete updated.label;
          nextMenuItems[item.id] = updated;
          menuChanged = true;
          push('menu_items', updated);
        }
      });
      if (menuChanged) {
        commitMap('menu_items', nextMenuItems);
      }
    },
    [commitMap, commitProfile, push, reportError],
  );

  const moveMenuItemsToLabel = useCallback(
    (menuIds: string[], targetLabel?: string) => {
      const trimmed = targetLabel?.trim() || undefined;
      const currentMenu = mapsRef.current.menu_items;
      let menuChanged = false;
      const nextMenuItems = { ...currentMenu };
      const now = Date.now();

      menuIds.forEach((id) => {
        const item = nextMenuItems[id];
        if (item && item.label !== trimmed) {
          const updated = { ...item, label: trimmed, updated_at: now };
          if (!trimmed) delete updated.label;
          nextMenuItems[id] = updated;
          menuChanged = true;
          push('menu_items', updated);
        }
      });

      if (menuChanged) {
        commitMap('menu_items', nextMenuItems);
      }

      if (trimmed) {
        addLabel(trimmed);
      }
    },
    [addLabel, commitMap, push],
  );

  const saveMenuItem = useCallback(
    (input: MenuInput): MenuItem => {
      const existing = mapsRef.current.menu_items[input.id];
      let imageVersion = existing?.image_version;

      if (input.photo) {
        imageVersion = input.photo.version;
        const old = imagesRef.current[input.id];
        if (old && old.uri !== input.photo.uri) void removeFile(old.uri);
        commitImages({
          ...imagesRef.current,
          [input.id]: { uri: input.photo.uri, version: input.photo.version },
        });
        const key = sessionRef.current?.store_key;
        if (key && isFirebaseConfigured()) {
          pushMenuImage(key, input.id, { data: input.photo.thumbDataUri, version: input.photo.version }).catch(
            reportError,
          );
        }
      }

      const trimmedLabel = input.label?.trim() || undefined;
      const record: MenuItem = {
        ...(existing ?? { updated_at: 0 }),
        id: input.id,
        title: input.title.trim(),
        price: input.price,
        is_active: input.is_active,
        ...(imageVersion !== undefined ? { image_version: imageVersion } : {}),
        ...(trimmedLabel ? { label: trimmedLabel } : {}),
      };
      if (!trimmedLabel && record.label) {
        delete record.label;
      }

      if (trimmedLabel) {
        addLabel(trimmedLabel);
      }

      return putRecord('menu_items', record);
    },
    [addLabel, commitImages, putRecord, reportError],
  );

  const setMenuActive = useCallback(
    (id: string, active: boolean) => {
      const existing = mapsRef.current.menu_items[id];
      if (existing) putRecord('menu_items', { ...existing, is_active: active });
    },
    [putRecord],
  );

  // ---------------------------------------------------------------- orders
  const addOrders = useCallback(
    (drafts: DraftOrder[], deliveryDate: string): number => {
      const now = Date.now();
      let created = 0;
      drafts.forEach((draft) => {
        const items = Object.entries(draft.quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([menuId, quantity]) => {
            const menuItem = mapsRef.current.menu_items[menuId];
            return {
              menu_id: menuId,
              title: menuItem?.title ?? 'Menu',
              quantity,
              unit_price: menuItem?.price ?? 0,
            };
          });
        if (items.length === 0 || !draft.customer_id) return;
        const order: Order = {
          id: makeOrderId(),
          updated_at: 0,
          customer_id: draft.customer_id,
          delivery_date: deliveryDate,
          delivery_slot: draft.slot,
          delivery_time: draft.time,
          items,
          note: draft.note.trim(),
          total_amount: items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
          delivery_method: 'SELF_COURIER',
          status: 'PENDING',
          is_paid: false,
          created_at: now,
        };
        putRecord('orders', order);
        created += 1;
      });
      return created;
    },
    [putRecord],
  );

  const setOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      const existing = mapsRef.current.orders[id];
      if (!existing) return;
      const { completed_at: _previous, ...rest } = existing;
      putRecord('orders', {
        ...rest,
        status,
        ...(status === 'COMPLETED' ? { completed_at: Date.now() } : {}),
      });
    },
    [putRecord],
  );

  const toggleOrderPaid = useCallback(
    (id: string) => {
      const existing = mapsRef.current.orders[id];
      if (existing) putRecord('orders', { ...existing, is_paid: !existing.is_paid });
    },
    [putRecord],
  );

  // ---------------------------------------------------------------- trash
  const moveToTrash = useCallback(
    (name: CollectionName, id: string) => {
      const record = (mapsRef.current[name] as Record<string, CollectionMap[CollectionName]>)[id];
      if (record) putRecord(name, { ...record, deleted_at: Date.now() } as CollectionMap[typeof name]);
    },
    [putRecord],
  );

  const restoreFromTrash = useCallback(
    (name: CollectionName, id: string) => {
      const record = (mapsRef.current[name] as Record<string, CollectionMap[CollectionName]>)[id];
      if (!record) return;
      const { deleted_at: _deleted, purged: _purged, ...rest } = record;
      putRecord(name, rest as CollectionMap[typeof name]);
    },
    [putRecord],
  );

  const deletePermanently = useCallback(
    (name: CollectionName, id: string) => {
      const record = (mapsRef.current[name] as Record<string, CollectionMap[CollectionName]>)[id];
      if (!record) return;
      putRecord(name, {
        ...record,
        deleted_at: record.deleted_at ?? Date.now(),
        purged: true,
      } as CollectionMap[typeof name]);
    },
    [putRecord],
  );

  // ---------------------------------------------------------------- posters (lokal)
  const savePoster = useCallback(
    async (tempUri: string, title: string, ratio: '9:16' | '3:4'): Promise<PosterRecord> => {
      const id = makeId('POSTER');
      const uri = await savePosterFile(tempUri, id);
      const record: PosterRecord = { id, uri, title, ratio, created_at: Date.now() };
      commitPosters([record, ...postersRef.current]);
      return record;
    },
    [commitPosters],
  );

  const deletePoster = useCallback(
    async (id: string) => {
      const target = postersRef.current.find((poster) => poster.id === id);
      commitPosters(postersRef.current.filter((poster) => poster.id !== id));
      await removeFile(target?.uri);
    },
    [commitPosters],
  );

  // ---------------------------------------------------------------- logos (lokal)
  const saveLogo = useCallback(
    async (name: string, tempUri: string): Promise<StoreLogo> => {
      const id = makeId('LOGO');
      const uri = await saveLogoFile(tempUri, id);
      const record: StoreLogo = {
        id,
        name: name.trim() || 'Logo Toko',
        uri,
        created_at: Date.now(),
      };
      commitLogos([record, ...logosRef.current]);
      return record;
    },
    [commitLogos],
  );

  const deleteLogo = useCallback(
    async (id: string) => {
      const target = logosRef.current.find((l) => l.id === id);
      commitLogos(logosRef.current.filter((l) => l.id !== id));
      await removeFile(target?.uri);
    },
    [commitLogos],
  );

  const updateLogoName = useCallback(
    async (id: string, name: string) => {
      const next = logosRef.current.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l));
      commitLogos(next);
    },
    [commitLogos],
  );

  // ---------------------------------------------------------------- derived lists
  const value = useMemo<StoreContextValue>(() => {
    const withImage = (item: MenuItem): MenuItemView => ({ ...item, image_uri: images[item.id]?.uri });

    const allMenu: Record<string, MenuItemView> = {};
    Object.values(maps.menu_items).forEach((item) => {
      allMenu[item.id] = withImage(item);
    });

    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    const byDeleted = (a: { deleted_at?: number }, b: { deleted_at?: number }) =>
      (b.deleted_at ?? 0) - (a.deleted_at ?? 0);

    const customers = Object.values(maps.customers).filter((c) => !isHidden(c)).sort(byName);
    const menu = Object.values(allMenu)
      .filter((m) => !isHidden(m))
      .sort((a, b) => a.title.localeCompare(b.title));
    const orders = Object.values(maps.orders)
      .filter((o) => !isHidden(o))
      .sort((a, b) =>
        a.delivery_date === b.delivery_date
          ? a.delivery_time.localeCompare(b.delivery_time)
          : a.delivery_date.localeCompare(b.delivery_date),
      );

    const fromProfile = profile?.menu_labels ?? [];
    const fromMenu = Object.values(maps.menu_items)
      .filter((m) => !isHidden(m) && m.label && m.label.trim())
      .map((m) => m.label!.trim());
    const labels = Array.from(new Set([...fromProfile, ...fromMenu])).filter(Boolean);

    return {
      ready,
      session,
      profile,
      online,
      syncEnabled,
      syncError,
      activeDevices,
      customers,
      menu,
      orders,
      allCustomers: maps.customers,
      allMenu,
      trashOrders: Object.values(maps.orders).filter(isInTrash).sort(byDeleted),
      trashCustomers: Object.values(maps.customers).filter(isInTrash).sort(byDeleted),
      trashMenu: Object.values(allMenu).filter(isInTrash).sort(byDeleted),
      posters,
      labels,
      logos,
      createStore,
      joinStore,
      leaveStore,
      saveStoreProfile,
      saveCustomer,
      saveMenuItem,
      setMenuActive,
      addLabel,
      renameLabel,
      deleteLabel,
      moveMenuItemsToLabel,
      saveLogo,
      deleteLogo,
      updateLogoName,
      addOrders,
      setOrderStatus,
      toggleOrderPaid,
      moveToTrash,
      restoreFromTrash,
      deletePermanently,
      savePoster,
      deletePoster,
    };
  }, [
    ready, session, profile, online, syncEnabled, syncError, activeDevices, maps, images, posters, logos,
    createStore, joinStore, leaveStore, saveStoreProfile, saveCustomer, saveMenuItem, setMenuActive,
    addLabel, renameLabel, deleteLabel, moveMenuItemsToLabel, saveLogo, deleteLogo, updateLogoName,
    addOrders, setOrderStatus, toggleOrderPaid, moveToTrash, restoreFromTrash, deletePermanently,
    savePoster, deletePoster,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore harus dipakai di dalam <StoreProvider>.');
  return context;
}
