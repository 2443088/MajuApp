import type { Customer, Order } from '../types';
import { deliveryLabel, formatRupiah } from '../utils/format';

const LINE = '-'.repeat(39);

/**
 * Teks terstruktur untuk dibagikan ke GoSend / Grab / kurir pribadi (pilar 3 blueprint).
 * Baris kosong (patokan, link, catatan) dibuang agar pesan tidak berlubang.
 */
export function buildCourierText(order: Order, customer: Customer | undefined, storeName: string): string {
  const lines: (string | null)[] = [
    `PESANAN ${storeName}`,
    LINE,
    `Penerima : ${customer?.name ?? '-'}`,
    `No. HP : ${customer?.whatsapp_number || '-'}`,
    `Alamat : ${customer?.address_text || '-'}`,
    customer?.landmark ? `Patokan : ${customer.landmark}` : null,
    customer?.maps_url ? `Link Maps : ${customer.maps_url}` : null,
    LINE,
    'Detail Pesanan:',
    ...order.items.map((item) => `- ${item.title} (${item.quantity}x)`),
    order.note ? `Catatan : ${order.note}` : null,
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
}
