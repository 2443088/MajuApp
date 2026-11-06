import type { Coordinates } from '../types';

const EARTH_RADIUS_KM = 6371;
/** Google Maps URL: 1 tujuan + maksimal 9 waypoint = 10 titik per tautan. */
export const MAX_STOPS_PER_URL = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** d = 2r * asin( sqrt( sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2) ) ) */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface RouteStop<T = unknown> {
  coordinates: Coordinates;
  payload: T;
}

/**
 * Nearest Neighbor: mulai dari titik asal, selalu pilih titik belum dikunjungi yang
 * terdekat. Heuristik jarak garis lurus; bukan rute optimal dan bukan jarak jalan raya.
 */
export function nearestNeighborOrder<T>(origin: Coordinates, stops: RouteStop<T>[]): RouteStop<T>[] {
  const remaining = [...stops];
  const ordered: RouteStop<T>[] = [];
  let current = origin;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const distance = haversineKm(current, remaining[i].coordinates);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next.coordinates;
  }
  return ordered;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const fmt = (c: Coordinates) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`;

export function buildDirectionsUrl(origin: Coordinates, stops: Coordinates[]): string {
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  let url =
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${fmt(origin)}&destination=${fmt(destination)}&travelmode=driving`;
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.map(fmt).join('%7C')}`;
  }
  return url;
}

export interface RouteBatch<T = unknown> {
  index: number;
  total: number;
  stops: RouteStop<T>[];
  url: string;
}

/**
 * Urutkan dengan Nearest Neighbor lalu pecah per 10 titik. Titik awal kluster berikutnya
 * adalah tujuan akhir kluster sebelumnya, jadi rute tetap menyambung.
 */
export function buildRouteBatches<T>(origin: Coordinates, stops: RouteStop<T>[]): RouteBatch<T>[] {
  if (stops.length === 0) return [];
  const ordered = nearestNeighborOrder(origin, stops);
  const groups = chunk(ordered, MAX_STOPS_PER_URL);
  let start = origin;
  return groups.map((group, index) => {
    const url = buildDirectionsUrl(start, group.map((s) => s.coordinates));
    start = group[group.length - 1].coordinates;
    return { index: index + 1, total: groups.length, stops: group, url };
  });
}

export function buildSingleStopUrl(destination: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${fmt(destination)}&travelmode=driving`;
}

export function buildSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function validCoordinates(lat: number, lon: number): Coordinates | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (lat === 0 && lon === 0) return null;
  return { latitude: lat, longitude: lon };
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';
const PATTERNS: RegExp[] = [
  // Lokasi pin sebenarnya (lebih akurat daripada pusat viewport "@lat,lng")
  new RegExp(`!3d${NUM}!4d${NUM}`),
  new RegExp(`[?&](?:q|ll|query|destination|daddr|center)=${NUM}(?:,|%2C|%2c|\\+)\\s*${NUM}`),
  new RegExp(`/@${NUM},${NUM}`),
  new RegExp(`@${NUM},${NUM}`),
  // Teks polos "lat, lng" yang ditempel langsung
  new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`),
];

export function extractCoordinates(text: string): Coordinates | null {
  if (!text) return null;
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text;
  }
  for (const source of [text, decoded]) {
    for (const pattern of PATTERNS) {
      const match = source.match(pattern);
      if (match) {
        const found = validCoordinates(parseFloat(match[1]), parseFloat(match[2]));
        if (found) return found;
      }
    }
  }
  return null;
}

export function isShortMapsLink(url: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(url.trim());
}

export interface ResolvedLink {
  coordinates: Coordinates | null;
  finalUrl: string;
}

/**
 * Tautan panjang: cukup regex. Tautan pendek (maps.app.goo.gl) tidak memuat koordinat,
 * jadi harus diikuti redirect-nya dulu. Butuh internet; bila gagal, koordinat = null.
 */
export async function resolveMapsLink(input: string): Promise<ResolvedLink> {
  const url = input.trim();
  if (!url) return { coordinates: null, finalUrl: '' };

  const direct = extractCoordinates(url);
  if (direct) return { coordinates: direct, finalUrl: url };
  if (!/^https?:\/\//i.test(url)) return { coordinates: null, finalUrl: url };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    const finalUrl = response.url || url;
    const fromUrl = extractCoordinates(finalUrl);
    if (fromUrl) return { coordinates: fromUrl, finalUrl };
    const html = await response.text();
    return { coordinates: extractCoordinates(html), finalUrl };
  } catch {
    return { coordinates: null, finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}
