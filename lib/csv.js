import { rp } from './format'

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
  program: 'program', tujuan: 'program', untukprogram: 'program',
  // format buku kas Excel: Tanggal | Bulan | Uang Masuk | Uang Keluar | Total | Keterangan
  uangmasuk: 'uang_masuk', masuk: 'uang_masuk', pemasukan: 'uang_masuk', debit: 'uang_masuk',
  uangkeluar: 'uang_keluar', keluar: 'uang_keluar', pengeluaran: 'uang_keluar', kredit: 'uang_keluar',
  total: 'total', saldo: 'total',
}
const rapikan = (h) => String(h ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '')

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

const bersih = (v) => {
  const s = String(v ?? '').trim()
  return s === '' || s.toLowerCase() === 'kas keluarga' ? null : s
}

// Ubah baris sel Excel (angka, tanggal, teks) menjadi tabel teks seperti hasil parseCsv.
export function excelKeTabel(rows) {
  const teks = (v) => {
    if (v === null || v === undefined) return ''
    if (v instanceof Date) {
      if (Number.isNaN(v.getTime())) return ''
      // pembaca xlsx memberi tanggal pada tengah malam UTC
      return `${v.getUTCFullYear()}-${dua(v.getUTCMonth() + 1)}-${dua(v.getUTCDate())}`
    }
    return String(v)
  }
  return rows.map((r) => r.map(teks))
}

// Cari baris judul kolom (dalam 10 baris pertama). Mengembalikan { tabel, mulai } atau null.
export function cariTabel(tabel) {
  for (let i = 0; i < Math.min(10, tabel.length); i++) {
    const p = petaKolom(tabel[i])
    if (p.tanggal !== undefined && p.alasan !== undefined &&
        (p.jumlah !== undefined || p.uang_masuk !== undefined || p.uang_keluar !== undefined)) {
      return { tabel: tabel.slice(i), mulai: i }
    }
  }
  return null
}

// Menebak pemberi / penerima / kategori dari teks keterangan (tanpa kolom khusus).
// Aturannya sederhana dan hasilnya selalu bisa diperiksa di pratinjau sebelum impor.
const TIPO = '(?:[a-z]\\/n|a\\.n\\.?|an)' // a/n, dan salah ketik umum seperti p/n, u/n
const rapiNama = (t) => t.replace(/\s+/g, ' ').replace(/^[\s\-–:,]+|[\s\-–:,]+$/g, '').trim()
const potongNama = (t) => rapiNama(t.split(/\s+u\/|\s+untuk\s|\s+yang\s|\s+via\s|\s*[-–]\s+|,|\s\(/i)[0])

export function bacaKeterangan(k, tipe) {
  const s = String(k ?? '').trim()
  const out = { dari: null, ke: null, kategori: null }
  if (!s) return out
  if (tipe === 'masuk') {
    out.kategori = 'Sumbangan'
    // "Dari a/n Wening" | "Transfer Dari p/n Dian" | "... dari Kel. Wening" | "Dari Donatur u/ Omah Joglo"
    let m = s.match(new RegExp('\\bdari\\s+' + TIPO + '\\s+(.+)$', 'i'))
    if (m) out.dari = rapiNama(m[1])
    else if ((m = s.match(/\bdari\s+(.+)$/i))) out.dari = potongNama(m[1]) || null
  } else if (tipe === 'keluar') {
    // "Transfer ke a/n Wartiningsih" | "Tali Asih untuk Cucu Mbah Sugar" | "Donasi u/ Omah Joglo"
    let m = s.match(new RegExp('\\bke\\s+' + TIPO + '\\s+(.+)$', 'i'))
    if (m) out.ke = rapiNama(m[1])
    else if ((m = s.match(/(?:^|\s)(?:untuk|u\/|buat|kepada)\s+(.+)$/i))) out.ke = potongNama(m[1]) || null
    if (!out.ke && /\b(admin|sms|monthly fee|montly fee|fee atm|biaya)\b/i.test(s)) {
      out.ke = 'Bank'; out.kategori = 'Lain-lain'
    } else if (/tali asih|duka|santunan|sakit|shodaqoh|sedekah|donasi|wakaf|zakat|infaq|infak|masjid|pondok|pesantren|ponpes|yayasan/i.test(s)) {
      out.kategori = 'Santunan / sosial'
    }
  }
  return out
}

// Ubah tabel (dari CSV atau Excel) menjadi baris siap-impor + daftar galat per baris.
// Mendukung dua bentuk: kolom "jumlah" (+ jenis), atau kolom "Uang Masuk" / "Uang Keluar" terpisah.
export function siapkanBaris(tabel, anggota = [], program = [], mulai = 0, { tebak = true } = {}) {
  if (tabel.length < 2) return { galatUmum: 'File kosong atau hanya berisi judul kolom.', baris: [], peringatan: [], catatan: [] }
  const peta = petaKolom(tabel[0])
  const dua2 = peta.uang_masuk !== undefined || peta.uang_keluar !== undefined
  const hilang = []
  if (peta.tanggal === undefined) hilang.push('Tanggal')
  if (peta.jumlah === undefined && !dua2) hilang.push('Uang Masuk / Uang Keluar')
  if (peta.alasan === undefined) hilang.push('Keterangan')
  if (hilang.length) {
    return { galatUmum: 'Kolom yang wajib ada belum ditemukan: ' + hilang.join(', ') + '. Gunakan template dari tombol unduh.', baris: [], peringatan: [], catatan: [] }
  }
  const ambil = (r, k) => (peta[k] === undefined ? '' : r[peta[k]] ?? '')
  const idPerNama = new Map(anggota.map((a) => [a.nama.trim().toLowerCase(), a.id]))
  const idProgram = new Map(program.map((p) => [p.nama.trim().toLowerCase(), p.id]))

  const baris = []
  let tanpaKet = 0, dariOtomatis = 0, keOtomatis = 0, katOtomatis = 0
  tabel.slice(1).forEach((r, i) => {
    const kosong = ['tanggal', 'jumlah', 'uang_masuk', 'uang_keluar', 'alasan', 'dari', 'ke'].every((k) => String(ambil(r, k)).trim() === '')
    if (kosong) return // baris sisa (mis. hanya berisi rumus Bulan/Total)

    const galat = []
    const tanggal = ubahTanggal(ambil(r, 'tanggal'))
    if (!tanggal) galat.push('tanggal tidak dikenali')

    let bertanda = null, tipe = null
    if (dua2) {
      const m = String(ambil(r, 'uang_masuk')).trim() === '' ? null : ubahJumlah(ambil(r, 'uang_masuk'))
      const k = String(ambil(r, 'uang_keluar')).trim() === '' ? null : ubahJumlah(ambil(r, 'uang_keluar'))
      const mAda = String(ambil(r, 'uang_masuk')).trim() !== '', kAda = String(ambil(r, 'uang_keluar')).trim() !== ''
      if (mAda && kAda) galat.push('isi salah satu: Uang Masuk atau Uang Keluar')
      else if (!mAda && !kAda) galat.push('jumlah kosong')
      else if (mAda && !m) galat.push('Uang Masuk tidak sah')
      else if (kAda && !k) galat.push('Uang Keluar tidak sah')
      else if (mAda) { bertanda = Math.abs(m); tipe = 'masuk' }
      else { bertanda = Math.abs(k); tipe = 'keluar' }
    } else {
      bertanda = ubahJumlah(ambil(r, 'jumlah'))
      if (!bertanda) galat.push('jumlah tidak sah')
      tipe = ubahJenis(ambil(r, 'jenis'))
      if (!tipe && String(ambil(r, 'jenis')).trim() !== '') galat.push('jenis harus masuk/keluar')
      if (!tipe && bertanda) tipe = bertanda < 0 ? 'keluar' : 'masuk'
      if (!tipe && !galat.length) galat.push('jenis tidak diketahui')
    }
    let alasan = String(ambil(r, 'alasan')).trim()
    if (!alasan && tipe) { alasan = tipe === 'masuk' ? 'Uang masuk' : 'Uang keluar'; tanpaKet++ }
    if (!alasan) galat.push('keterangan kosong')

    let dari = bersih(ambil(r, 'dari'))
    let ke = bersih(ambil(r, 'ke'))
    let kategori = bersih(ambil(r, 'kategori'))
    if (tebak && tipe && (!dari || !ke || !kategori)) {
      const t = bacaKeterangan(alasan, tipe)
      if (!dari && t.dari) { dari = t.dari; dariOtomatis++ }
      if (!ke && t.ke) { ke = t.ke; keOtomatis++ }
      if (!kategori && t.kategori) { kategori = t.kategori; katOtomatis++ }
    }
    const anggota_id = tipe === 'masuk' && dari ? idPerNama.get(dari.toLowerCase()) ?? null : null
    const namaProgram = String(ambil(r, 'program')).trim()
    let program_id = null
    if (namaProgram) {
      program_id = idProgram.get(namaProgram.toLowerCase()) ?? null
      if (!program_id) galat.push(`program "${namaProgram}" belum dibuat`)
    }

    const total = peta.total !== undefined && String(ambil(r, 'total')).trim() !== '' ? ubahJumlah(ambil(r, 'total')) : null
    baris.push({
      no: i + 2 + mulai, galat, tanggal, tipe,
      jumlah: bertanda ? Math.abs(bertanda) : null,
      dari, ke, alasan, kategori, anggota_id, program_id, total,
    })
  })

  // Periksa kolom Total (saldo berjalan) terhadap hitungan sendiri.
  const peringatan = []
  if (peta.total !== undefined) {
    let saldo = null, salah = 0
    for (const b of baris) {
      if (b.galat.length || !b.jumlah) { saldo = null; continue }
      const net = b.tipe === 'masuk' ? b.jumlah : -b.jumlah
      if (b.total !== null) {
        if (saldo === null) saldo = b.total - net // saldo awal diambil dari baris pertama
        else if (saldo + net !== b.total) {
          salah++
          if (salah <= 5) peringatan.push(`Baris ${b.no}: Total di file ${rp(b.total)}, hitungan aplikasi ${rp(saldo + net)}.`)
        }
        saldo = b.total // lanjut dari angka file agar satu salah tidak menandai semua baris berikutnya
      } else if (saldo !== null) saldo += net
    }
    if (salah > 5) peringatan.push(`Dan ${salah - 5} baris lain dengan Total yang tidak cocok.`)
  }
  const catatan = []
  if (tanpaKet) catatan.push(`${tanpaKet} baris tanpa keterangan diisi otomatis "Uang masuk" atau "Uang keluar".`)
  if (dariOtomatis + keOtomatis + katOtomatis) {
    catatan.push(`Diisi otomatis dari keterangan: ${dariOtomatis} pemberi, ${keOtomatis} penerima, ${katOtomatis} kategori. Periksa kolom Dari, Untuk dan Kategori di pratinjau.`)
  }
  return { galatUmum: null, baris, peringatan, catatan }
}

export const CONTOH_CSV =
  'tanggal;jenis;jumlah;dari;ke;keperluan;kategori;program\r\n' +
  '2026-10-03;masuk;50000;Paman Ali;;Sumbangan sukarela;Sumbangan;Santunan sakit\r\n' +
  '2026-10-10;keluar;175000;;Toko Berkah;Beli konsumsi pengajian;Konsumsi;\r\n'
