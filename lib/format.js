export const KATEGORI = [
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

// ---------- bulan (format 'YYYY-MM') ----------
// bulan berjalan menurut WIB, bukan zona waktu server
export const bulanIni = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 7)

export const geserBulan = (b, n) => {
  const [y, m] = b.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}

// daftar bulan dari `dari` sampai `sampai` (inklusif), urut naik
export const rentangBulan = (dari, sampai) => {
  const hasil = []
  for (let b = dari; b <= sampai && hasil.length < 600; b = geserBulan(b, 1)) hasil.push(b)
  return hasil
}

export const bulanPendek = (b) => {
  const [y, m] = b.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short' })
}

export const adalahBulan = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || '')
