// Pembaca CSV sederhana untuk impor catatan lama (Excel Indonesia memakai titik-koma).

export function parseCsv(teks) {
  const s = teks.replace(/^﻿/, '')
  const baris1 = s.split(/\r?\n/, 1)[0] ?? ''
  const pemisah = [';', ',', '\t']
    .map((p) => [p, baris1.split(p).length])
    .sort((a, b) => b[1] - a[1])[0][0]

  const hasil = []
  let sel = '', baris = [], kutip = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (kutip) {
      if (c === '"' && s[i + 1] === '"') { sel += '"'; i++ }
      else if (c === '"') kutip = false
      else sel += c
    } else if (c === '"') kutip = true
    else if (c === pemisah) { baris.push(sel); sel = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      baris.push(sel); sel = ''
      if (baris.some((x) => x.trim() !== '')) hasil.push(baris)
      baris = []
    } else sel += c
  }
  baris.push(sel)
  if (baris.some((x) => x.trim() !== '')) hasil.push(baris)
  return hasil
}

// nama kolom (diseragamkan) -> nama baku
const KOLOM = {
  tanggal: 'tanggal', tgl: 'tanggal', date: 'tanggal',
  jenis: 'jenis', tipe: 'jenis', type: 'jenis',
  jumlah: 'jumlah', jumlahrp: 'jumlah', nominal: 'jumlah', amount: 'jumlah',
  dari: 'dari', ke: 'ke', untuk: 'ke',
  keperluan: 'alasan', alasan: 'alasan', keterangan: 'alasan', uraian: 'alasan', deskripsi: 'alasan',
  kategori: 'kategori',
  untukbulan: 'periode', periode: 'periode', bulaniuran: 'periode', bulan: 'periode',
}
const rapikan = (h) => h.toLowerCase().replace(/[^a-z]/g, '')

export function petaKolom(header) {
  const peta = {}
  header.forEach((h, i) => {
    const baku = KOLOM[rapikan(h)]
    if (baku && peta[baku] === undefined) peta[baku] = i
  })
  return peta
}

const adaTanggal = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}
const dua = (n) => String(n).padStart(2, '0')

// '2026-10-04' | '04/10/2026' | '4-10-26' -> '2026-10-04' (null jika tidak sah)
export function ubahTanggal(v) {
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  let y, mo, d
  if (m) [y, mo, d] = [+m[1], +m[2], +m[3]]
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) {
    d = +m[1]; mo = +m[2]; y = +m[3]
    if (m[3].length === 2) y += 2000
  } else return null
  return adaTanggal(y, mo, d) ? `${y}-${dua(mo)}-${dua(d)}` : null
}

// 'Rp 1.500.000' | '1,500,000' | '1.500.000,00' | '-150000' -> 1500000 (angka bertanda; null jika tidak sah)
export function ubahJumlah(v) {
  let s = String(v ?? '').replace(/[^\d.,-]/g, '')
  if (!s) return null
  const negatif = s.startsWith('-')
  s = s.replace(/-/g, '').replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, '')
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  if (!Number.isSafeInteger(n) || n === 0) return null
  return negatif ? -n : n
}

export function ubahJenis(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (['masuk', 'pemasukan', 'in', 'm', 'debit', 'uang masuk'].includes(s)) return 'masuk'
  if (['keluar', 'pengeluaran', 'out', 'k', 'kredit', 'uang keluar'].includes(s)) return 'keluar'
  return null
}

// '2026-10' | '10/2026' | '2026-10-01' -> '2026-10-01' (tanggal 1 bulan itu)
export function ubahPeriode(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  let m = s.match(/^(\d{4})[-/](\d{1,2})/)
  if (m) return +m[2] >= 1 && +m[2] <= 12 ? `${m[1]}-${dua(+m[2])}-01` : null
  m = s.match(/^(\d{1,2})[-/](\d{4})$/)
  return m && +m[1] >= 1 && +m[1] <= 12 ? `${m[2]}-${dua(+m[1])}-01` : null
}

const bersih = (v) => {
  const s = String(v ?? '').trim()
  return s === '' || s.toLowerCase() === 'kas keluarga' ? null : s
}

// Ubah hasil parseCsv menjadi baris siap-impor + daftar galat per baris.
export function siapkanBaris(tabel, anggota = []) {
  if (tabel.length < 2) return { galatUmum: 'File kosong atau hanya berisi judul kolom.', baris: [] }
  const peta = petaKolom(tabel[0])
  const wajib = ['tanggal', 'jumlah', 'alasan']
  const hilang = wajib.filter((k) => peta[k] === undefined)
  if (hilang.length) {
    const nama = { tanggal: 'tanggal', jumlah: 'jumlah', alasan: 'keperluan' }
    return { galatUmum: 'Kolom yang wajib ada belum ditemukan: ' + hilang.map((k) => nama[k]).join(', ') + '.', baris: [] }
  }
  const ambil = (r, k) => (peta[k] === undefined ? '' : r[peta[k]])
  const idPerNama = new Map(anggota.map((a) => [a.nama.trim().toLowerCase(), a.id]))

  const baris = tabel.slice(1).map((r, i) => {
    const galat = []
    const tanggal = ubahTanggal(ambil(r, 'tanggal'))
    if (!tanggal) galat.push('tanggal tidak dikenali')
    const bertanda = ubahJumlah(ambil(r, 'jumlah'))
    if (!bertanda) galat.push('jumlah tidak sah')
    let tipe = ubahJenis(ambil(r, 'jenis'))
    if (!tipe && String(ambil(r, 'jenis')).trim() !== '') galat.push('jenis harus masuk/keluar')
    if (!tipe && bertanda) tipe = bertanda < 0 ? 'keluar' : 'masuk'
    if (!tipe && !galat.length) galat.push('jenis tidak diketahui')
    const alasan = String(ambil(r, 'alasan')).trim()
    if (!alasan) galat.push('keperluan kosong')

    const dari = bersih(ambil(r, 'dari'))
    const ke = bersih(ambil(r, 'ke'))
    const kategori = bersih(ambil(r, 'kategori'))
    const anggota_id = tipe === 'masuk' && dari ? idPerNama.get(dari.toLowerCase()) ?? null : null
    let periode = ubahPeriode(ambil(r, 'periode'))
    // iuran dari anggota tanpa keterangan bulan: anggap untuk bulan tanggal pembayaran
    if (!periode && anggota_id && kategori?.toLowerCase() === 'iuran' && tanggal) periode = tanggal.slice(0, 7) + '-01'
    if (!anggota_id) periode = null

    return {
      no: i + 2, galat, tanggal, tipe,
      jumlah: bertanda ? Math.abs(bertanda) : null,
      dari, ke, alasan, kategori, anggota_id, periode,
    }
  })
  return { galatUmum: null, baris }
}

export const CONTOH_CSV =
  'tanggal;jenis;jumlah;dari;ke;keperluan;kategori;untuk_bulan\r\n' +
  '2026-10-03;masuk;50000;Paman Ali;;Iuran Oktober;Iuran;2026-10\r\n' +
  '2026-10-10;keluar;175000;;Toko Berkah;Beli konsumsi pengajian;Konsumsi;\r\n'
