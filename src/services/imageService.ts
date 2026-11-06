import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const ROOT = FileSystem.documentDirectory ?? '';
const MENU_DIR = `${ROOT}menu/`;
const POSTER_DIR = `${ROOT}posters/`;
const LOGO_DIR = `${ROOT}logos/`;

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

export async function removeFile(uri?: string): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // berkas sudah tidak ada: aman diabaikan
  }
}

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/** Buka galeri. Photo Picker Android tidak membutuhkan izin storage. */
export async function pickFromGallery(square: boolean): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

export interface PreparedPhoto {
  /** Berkas lokal 800x800 WebP kualitas 75% (sekitar 100-200 KB). */
  uri: string;
  version: number;
  /** JPEG 360x360 sebagai data URI, dikirim ke Firebase agar muncul di HP lain. */
  thumbDataUri: string;
}

export async function pickMenuPhoto(menuId: string, version: number): Promise<PreparedPhoto | null> {
  const picked = await pickFromGallery(true);
  if (!picked) return null;

  const side = Math.min(picked.width, picked.height);
  const actions = [];
  if (side > 0 && picked.width !== picked.height) {
    actions.push({
      crop: {
        originX: Math.floor((picked.width - side) / 2),
        originY: Math.floor((picked.height - side) / 2),
        width: side,
        height: side,
      },
    });
  }
  actions.push({ resize: { width: 800, height: 800 } });

  const full = await manipulateAsync(picked.uri, actions, { compress: 0.75, format: SaveFormat.WEBP });
  const thumb = await manipulateAsync(full.uri, [{ resize: { width: 360, height: 360 } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });

  await ensureDir(MENU_DIR);
  const destination = `${MENU_DIR}${menuId}-${version}.webp`;
  await FileSystem.copyAsync({ from: full.uri, to: destination });
  await removeFile(full.uri);

  return { uri: destination, version, thumbDataUri: `data:image/jpeg;base64,${thumb.base64 ?? ''}` };
}

/** Simpan gambar kiriman perangkat lain (data URI base64) menjadi berkas lokal. */
export async function saveSyncedImage(menuId: string, version: number, dataUri: string): Promise<string> {
  await ensureDir(MENU_DIR);
  const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');
  const destination = `${MENU_DIR}${menuId}-${version}.jpg`;
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destination;
}

export async function savePosterFile(tempUri: string, id: string): Promise<string> {
  await ensureDir(POSTER_DIR);
  const destination = `${POSTER_DIR}${id}.png`;
  await FileSystem.copyAsync({ from: tempUri, to: destination });
  return destination;
}

/** Pilih gambar logo toko dari galeri tanpa membatasi aspek persegi agar aspek rasio logo asli terjaga. */
export async function pickLogoImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

export async function saveLogoFile(tempUri: string, id: string): Promise<string> {
  await ensureDir(LOGO_DIR);
  const destination = `${LOGO_DIR}${id}.png`;
  await FileSystem.copyAsync({ from: tempUri, to: destination });
  return destination;
}
