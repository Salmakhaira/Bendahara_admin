export default function manifest() {
  return {
    name: 'Kas Keluarga',
    short_name: 'Kas Keluarga',
    description: 'Catatan kas keluarga: saldo, iuran, pemasukan dan pengeluaran.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f6fa',
    theme_color: '#ffffff',
    lang: 'id',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
