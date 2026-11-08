interface TrackedOrder {
  id: string;
  code: string;
  customer: string;
  status: string;
  paymentStatus?: string;
}

const labels: Record<string, string> = {
  confirmed: 'Pembayaran terkonfirmasi. Pesanan sudah diterima gerai.',
  preparing: 'Gerai sedang menyiapkan pesananmu.',
  ready: 'Pesanan siap. Tunjukkan QR saat mengambil di gerai.',
  picked_up: 'Pesanan sudah diterima. Selamat menikmati!',
  cancelled: 'Pesanan dibatalkan.',
  no_show: 'Waktu pengambilan sudah berakhir. Hubungi gerai.',
  expired: 'Waktu pesanan berakhir. Periksa detail pesananmu.',
};

export function orderNotices(
  before: TrackedOrder[],
  after: TrackedOrder[],
  role: string,
): string[] {
  const previous = new Map(before.map((order) => [order.id, order]));
  return after.flatMap((order) => {
    const old = previous.get(order.id);
    if (!old)
      return role === 'seller'
        ? [`Pesanan baru ${order.code} dari ${order.customer}.`]
        : [];
    if (old.status !== order.status && role === 'student' && labels[order.status])
      return [`${order.code} · ${labels[order.status]}`];
    if (role === 'student' && old.paymentStatus !== 'refunded' && order.paymentStatus === 'refunded')
      return [`${order.code} · Pengembalian dana sudah dikonfirmasi.`];
    if (role === 'seller' && old.paymentStatus !== 'paid' && order.paymentStatus === 'paid')
      return [`${order.code} sudah dibayar dan siap diproses.`];
    return [];
  });
}
