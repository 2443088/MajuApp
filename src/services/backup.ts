import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildBackup } from './storage';
import { toISODate } from '../utils/format';

/**
 * Ekspor seluruh data toko ke satu berkas .json lalu buka share sheet Android,
 * sehingga bisa disimpan ke Google Drive, dikirim lewat WhatsApp, dst.
 * Foto menu tidak ikut (hanya data); foto tetap aman di Firebase dan di HP.
 */
export async function exportBackupJson(storeKey: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi berkas tidak tersedia di perangkat ini.');
  }
  const backup = await buildBackup(storeKey);
  const fileName = `MJ-backup-${storeKey}-${toISODate(new Date())}.json`;
  const uri = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Simpan cadangan data MJ',
    UTI: 'public.json',
  });
}
