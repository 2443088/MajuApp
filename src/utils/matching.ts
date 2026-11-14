import type { Customer, MenuItemView } from '../types';

// ------------------------------------------------------------------ dasar
const HONORIFICS = new Set(['ibu', 'bu', 'bapak', 'pak', 'kak', 'kakak', 'mbak', 'mas', 'om', 'tante', 'bang', 'abang', 'cik']);
/** Satuan jumlah yang bukan bagian nama menu. ("kotak", "paket", "botol" sengaja tidak ada: bisa bagian nama.) */
const QUANTITY_WORDS = new Set(['pcs', 'pc', 'porsi', 'bungkus', 'bks', 'buah', 'biji', 'x']);
const SYNONYMS: Record<string, string> = { gede: 'besar', jumbo: 'besar', bsr: 'besar', kcl: 'kecil' };

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((token) => SYNONYMS[token] ?? token);
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[rows - 1][cols - 1];
}

/** Dua kata dianggap sama bila identik, salah ketik 1 huruf (kata >= 5 huruf), atau yang pendek adalah awalan yang panjang. */
export function tokenEq(a: string, b: string): boolean {
  if (a === b) return true;
  const shortest = Math.min(a.length, b.length);
  if (shortest >= 5 && levenshtein(a, b) <= 1) return true;
  if (shortest >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}

interface Overlap {
  coverage: number;
  precision: number;
  f1: number;
}

function overlap(query: string[], target: string[]): Overlap {
  if (query.length === 0 || target.length === 0) return { coverage: 0, precision: 0, f1: 0 };
  const covered = query.filter((q) => target.some((t) => tokenEq(q, t))).length;
  const used = target.filter((t) => query.some((q) => tokenEq(q, t))).length;
  const coverage = covered / query.length;
  const precision = used / target.length;
  const f1 = coverage + precision === 0 ? 0 : (2 * coverage * precision) / (coverage + precision);
  return { coverage, precision, f1 };
}

// ------------------------------------------------------------------ pelanggan
export function nameTokens(name: string): string[] {
  const tokens = tokenize(name).filter((t) => !HONORIFICS.has(t));
  return tokens.length > 0 ? tokens : tokenize(name);
}

export interface CustomerMatch {
  /** exact: yakin satu orang; ambiguous: beberapa mirip; none: tidak ada yang mirip. */
  status: 'exact' | 'ambiguous' | 'none';
  customer?: Customer;
  candidates: Customer[];
}

export function matchCustomer(name: string, customers: Customer[]): CustomerMatch {
  const query = nameTokens(name);
  if (query.length === 0) return { status: 'none', candidates: [] };

  const scored = customers
    .map((customer) => ({ customer, ...overlap(query, nameTokens(customer.name)) }))
    .filter((entry) => entry.f1 >= 0.5)
    .sort((a, b) => b.f1 - a.f1 || b.coverage - a.coverage);

  if (scored.length === 0) return { status: 'none', candidates: [] };
  const [top] = scored;
  // Pasti hanya bila TIDAK ada pelanggan lain yang juga memuat seluruh kata yang dicari.
  const decisive = top.coverage === 1 && !scored.slice(1).some((entry) => entry.coverage === 1);
  const candidates = scored.slice(0, 4).map((entry) => entry.customer);
  if (decisive) return { status: 'exact', customer: top.customer, candidates };
  return { status: 'ambiguous', candidates };
}

/**
 * Pecah rekap chat WA (daftar nama) menjadi nama-nama. Mengabaikan nomor urut, bullet,
 * cap waktu WhatsApp, emoji, dan baris judul seperti "Rekap antar hari ini:".
 */
export function parseNameList(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  text
    .split(/\r?\n|[,;]/)
    .map((line) =>
      line
        .replace(/^\s*\[?\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}[,\s]+\d{1,2}[.:]\d{2}(?::\d{2})?\]?\s*[-–]?\s*/, '')
        .replace(/^\s*(?:\d+[.):\-]|[-•*▪●]+)\s*/, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .trim(),
    )
    .forEach((line) => {
      if (line.length < 2 || line.length > 40) return;
      if (/:$/.test(line)) return;
      if (/\b(rekap|antar|pengantaran|tanggal|total|hari ini|besok|lusa|kurir)\b/i.test(line)) return;
      const key = nameTokens(line).join(' ');
      if (!key || seen.has(key)) return;
      seen.add(key);
      names.push(line.replace(/\s+/g, ' '));
    });
  return names;
}

// ------------------------------------------------------------------ menu
export interface MenuMatch {
  /** exact: satu menu pasti; ambiguous: beberapa variasi cocok; unmatched: tidak ada yang pas. */
  status: 'exact' | 'ambiguous' | 'unmatched';
  menu?: MenuItemView;
  /** Pilihan untuk chip: variasi (ambiguous) atau saran terdekat (unmatched). */
  candidates: MenuItemView[];
}

export function menuTokens(text: string): string[] {
  return tokenize(text).filter((t) => !QUANTITY_WORDS.has(t));
}

export function matchMenu(raw: string, menu: MenuItemView[]): MenuMatch {
  const query = menuTokens(raw);
  if (query.length === 0) return { status: 'unmatched', candidates: [] };

  const scored = menu.map((item) => ({ item, ...overlap(query, menuTokens(item.title)) }));
  const covering = scored.filter((s) => s.coverage === 1).sort((a, b) => b.precision - a.precision);

  if (covering.length === 1) return { status: 'exact', menu: covering[0].item, candidates: [covering[0].item] };
  if (covering.length > 1) {
    if (covering[0].precision === 1) return { status: 'exact', menu: covering[0].item, candidates: [covering[0].item] };
    return { status: 'ambiguous', candidates: covering.map((s) => s.item) };
  }

  const suggestions = scored
    .filter((s) => s.f1 >= 0.5)
    .sort((a, b) => b.f1 - a.f1)
    .slice(0, 3)
    .map((s) => s.item);
  return { status: 'unmatched', candidates: suggestions };
}

/**
 * Label singkat untuk chip variasi: kata pada judul menu yang TIDAK disebut pelanggan.
 * "Susu Kedelai Besar" untuk tulisan "susu kedelai" -> "Besar".
 */
export function variantLabels(raw: string, candidates: MenuItemView[]): string[] {
  const rawTokens = menuTokens(raw);
  const labels = candidates.map((item) => {
    const extra = item.title
      .split(/\s+/)
      .filter((word) => {
        const tokens = menuTokens(word);
        return tokens.length > 0 && !tokens.every((t) => rawTokens.some((r) => tokenEq(r, t)));
      })
      .join(' ')
      .replace(/[()]/g, '')
      .trim();
    return extra || item.title;
  });
  const unique = new Set(labels);
  return unique.size === labels.length ? labels : candidates.map((item) => item.title);
}
