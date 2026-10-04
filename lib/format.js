export const KATEGORI = [
  'Iuran',
  'Sumbangan',
  'Acara keluarga',
  'Santunan / sosial',
  'Kesehatan',
  'Pendidikan',
  'Konsumsi',
  'Transportasi',
  'Lain-lain',
]

export const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

// 'YYYY-MM-DD' -> '4 Okt 2026' (tanpa konversi zona waktu)
export const tgl = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

// '2026-10' atau '2026-10-01' -> 'Oktober 2026'
export const bulanLabel = (b) => {
  const [y, m] = b.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export const waktu = (iso) =>
  new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB'

// tanggal hari ini (zona waktu perangkat) dalam format YYYY-MM-DD
export const hariIni = () => new Date().toLocaleDateString('sv-SE')
