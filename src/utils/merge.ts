import type { Syncable } from '../types';

export interface MergeResult<T> {
  merged: Record<string, T>;
  /** Record milik lokal yang lebih baru / belum ada di cloud, perlu dikirim ulang. */
  toPush: T[];
  changed: boolean;
}

/**
 * Gabungkan data lokal (cache offline) dengan snapshot Firebase.
 * Aturan: updated_at terbesar menang. Ini yang membuat perubahan saat offline
 * terkirim otomatis begitu HP kembali online, tanpa antrean tersendiri.
 */
export function mergeRecords<T extends Syncable>(
  local: Record<string, T>,
  remote: Record<string, T>,
): MergeResult<T> {
  const merged: Record<string, T> = {};
  const toPush: T[] = [];
  let changed = false;

  const ids = new Set<string>([...Object.keys(local), ...Object.keys(remote)]);
  ids.forEach((id) => {
    const l = local[id];
    const r = remote[id];
    if (l && !r) {
      merged[id] = l;
      toPush.push(l);
    } else if (!l && r) {
      merged[id] = r;
      changed = true;
    } else if (l && r) {
      if (l.updated_at > r.updated_at) {
        merged[id] = l;
        toPush.push(l);
      } else {
        merged[id] = r;
        if (r.updated_at !== l.updated_at) changed = true;
      }
    }
  });

  return { merged, toPush, changed };
}

export function isHidden(record: Syncable): boolean {
  return Boolean(record.deleted_at) || record.purged === true;
}

export function isInTrash(record: Syncable): boolean {
  return Boolean(record.deleted_at) && record.purged !== true;
}
