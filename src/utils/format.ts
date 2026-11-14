const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const DAY_MS = 24 * 60 * 60 * 1000;
export const RETENTION_DAYS = 7;

export function formatNumber(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRupiah(value: number): string {
  return `Rp ${formatNumber(value)}`;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Date -> 'YYYY-MM-DD' memakai zona waktu perangkat. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 'YYYY-MM-DD' -> Date pada jam 12:00 lokal (menghindari geser hari karena DST/zona). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function shortDate(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function longDate(iso: string): string {
  const d = fromISODate(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** 'Hari Ini' / 'Besok' / 'Lusa' / 'Rabu, 7 Oktober' */
export function relativeDateLabel(iso: string): string {
  const today = fromISODate(todayISO()).getTime();
  const diff = Math.round((fromISODate(iso).getTime() - today) / DAY_MS);
  if (diff === 0) return 'Hari Ini';
  if (diff === 1) return 'Besok';
  if (diff === 2) return 'Lusa';
  return longDate(iso);
}

export function dayShort(date: Date): string {
  return DAYS_SHORT[date.getDay()];
}

export function monthName(date: Date): string {
  return MONTHS[date.getMonth()];
}

export function deliveryLabel(slot: string, time: string): string {
  return `Harus ${slot} ${time}`;
}

/** Sebelum 12:00 = Pagi. Hanya untuk field lama delivery_slot (kompatibel dengan APK lama). */
export function slotFromTime(time: string): 'Pagi' | 'Siang' {
  const hour = parseInt(time.slice(0, 2), 10);
  return Number.isFinite(hour) && hour >= 12 ? 'Siang' : 'Pagi';
}

/** "Tunggu toko buka 07:30" bila ada keterangan, "07:30" bila tidak. Kosong bila tidak ada jam. */
export function timeText(time: string, note: string): string {
  if (!time) return '';
  const trimmed = note.trim();
  return trimmed ? `${trimmed} ${time}` : time;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

const HONORIFICS = /^(ibu|bu|bapak|pak|kak|mbak|mas|om|tante)\s+/i;

export function initialOf(name: string): string {
  const clean = name.trim().replace(HONORIFICS, '');
  return (clean[0] || name.trim()[0] || '?').toUpperCase();
}

/** Normalisasi nomor HP Indonesia ke format 08xxxxxxxx. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return `0${digits.slice(2)}`;
  if (digits.startsWith('0')) return digits;
  return `0${digits}`;
}

/** 0812-xxx / +62812xxx -> 62812xxx (format wa.me). */
export function toIntlPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function displayPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 9) return phone;
  return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Mengetik "0700" atau "07" menjadi "07:00" / "07". */
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomChars(length: number, alphabet: string = ID_ALPHABET): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function makeId(prefix: string): string {
  return `${prefix}-${randomChars(6)}`;
}

export function makeOrderId(date: Date = new Date()): string {
  const stamp = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  return `ORD-${stamp}-${randomChars(4)}`;
}

/** Kode toko: MJ- + 6 karakter tanpa huruf/angka yang mudah tertukar (O/0, I/1). */
export function makeStoreKey(): string {
  return `MJ-${randomChars(6)}`;
}

export function normalizeStoreKey(input: string): string {
  const clean = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return '';
  return clean.startsWith('MJ-') ? clean : `MJ-${clean.replace(/^MJ/, '')}`;
}

export function isValidStoreKey(key: string): boolean {
  return /^MJ-[A-Z0-9]{4,10}$/.test(key);
}

export function daysLeft(deletedAt: number, now: number = Date.now()): number {
  const left = RETENTION_DAYS - Math.floor((now - deletedAt) / DAY_MS);
  return Math.max(0, left);
}

export function daysAgo(timestamp: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS));
}
