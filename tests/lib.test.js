import test from 'node:test'
import assert from 'node:assert/strict'
import { rp, bulanLabel, geserBulan, rentangBulan, adalahBulan, bulanPendek } from '../lib/format.js'
import { bacaFilter, qs } from '../lib/query.js'
import { parseCsv, ubahTanggal, ubahJumlah, siapkanBaris, cariTabel, excelKeTabel, bacaKeterangan } from '../lib/csv.js'
import { hitungProgram, penyumbang } from '../lib/program.js'
import { kelompokkan } from '../lib/riwayat.js'
import { linkWa, pesanTransaksi, pesanAjakan } from '../lib/wa.js'

test('format: rupiah, bulan, rentang', () => {
  assert.equal(rp(1500000), 'Rp 1.500.000')
  assert.equal(rp(null), 'Rp 0')
  assert.equal(bulanLabel('2026-10'), 'Oktober 2026')
  assert.equal(geserBulan('2026-12', 1), '2027-01')
  assert.equal(geserBulan('2026-01', -1), '2025-12')
  assert.deepEqual(rentangBulan('2026-11', '2027-02'), ['2026-11', '2026-12', '2027-01', '2027-02'])
  assert.ok(adalahBulan('2026-10') && !adalahBulan('2026-13') && !adalahBulan(''))
  assert.equal(bulanPendek('2026-03'), 'Mar')
})

test('query: filter dibersihkan dari karakter berbahaya', () => {
  assert.deepEqual(bacaFilter({ bulan: '2026-13', tipe: 'x', q: 'a,b(c)%*"d' }), { bulan: '', tipe: '', q: 'a b c d' })
  assert.equal(bacaFilter({ q: 'x'.repeat(100) }).q.length, 60)
  assert.equal(bacaFilter({ bulan: ['2026-05', '2026-06'] }).bulan, '2026-05')
  assert.equal(qs({ a: '1', b: '' }), '?a=1')
  assert.equal(qs({}), '')
})

test('csv: pemisah, kutip, BOM, baris kosong', () => {
  assert.deepEqual(parseCsv('﻿a;b\r\n"x;1";"y ""q"""\r\n\r\n'), [['a', 'b'], ['x;1', 'y "q"']])
  assert.deepEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']])
  assert.deepEqual(parseCsv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']])
})

test('csv: tanggal dan jumlah', () => {
  assert.equal(ubahTanggal('01/06/2024'), '2024-06-01')
  assert.equal(ubahTanggal('2024-6-1'), '2024-06-01')
  assert.equal(ubahTanggal('4-10-26'), '2026-10-04')
  assert.equal(ubahTanggal('31/02/2024'), null)
  assert.equal(ubahTanggal('abc'), null)
  assert.equal(ubahJumlah('Rp 15.425.000'), 15425000)
  assert.equal(ubahJumlah('1.500.000,00'), 1500000)
  assert.equal(ubahJumlah('-150000'), -150000)
  assert.equal(ubahJumlah('0'), null)
  assert.equal(ubahJumlah(''), null)
})

const HEADER = ['Tanggal', 'Bulan', 'Uang Masuk', 'Uang Keluar', 'Total', 'Keterangan']

test('impor: format buku kas (Uang Masuk / Uang Keluar / Total)', () => {
  const h = siapkanBaris([HEADER,
    ['2024-06-01', 'Jun 2024', '15435000', '', '15435000', 'Uang Masuk Pertama Kali'],
    ['2024-06-01', 'Jun 2024', '300000', '', '15735000', 'Dari a/n Wening'],
    ['2024-06-03', 'Jun 2024', '', 'Rp 2.500', '15732500', 'Admin Bank'],
  ])
  assert.equal(h.galatUmum, null)
  assert.equal(h.baris.length, 3)
  assert.deepEqual(h.baris.map((b) => [b.tipe, b.jumlah]), [['masuk', 15435000], ['masuk', 300000], ['keluar', 2500]])
  assert.equal(h.baris[1].dari, 'Wening')
  assert.equal(h.baris[2].ke, 'Bank')
  assert.deepEqual(h.peringatan, [])
})

test('impor: Total tidak cocok diberi peringatan, satu salah tidak menandai semua', () => {
  const h = siapkanBaris([HEADER,
    ['2024-06-01', '', '1000', '', '1000', 'a'],
    ['2024-06-02', '', '', '200', '999', 'b'], // seharusnya 800
    ['2024-06-03', '', '100', '', '1099', 'c'], // konsisten dari 999
  ])
  assert.equal(h.peringatan.length, 1)
  assert.match(h.peringatan[0], /Baris 3/)
})

test('impor: kedua kolom terisi / kosong / tanggal salah ditolak, baris kosong dilewati', () => {
  const h = siapkanBaris([HEADER,
    ['2024-06-01', '', '100', '50', '', 'dobel'],
    ['2024-06-01', '', '', '', '', 'tanpa jumlah'],
    ['31/02/2024', '', '100', '', '', 'tanggal'],
    ['1/1/1900', '', '100', '', '', 'tahun aneh'],
    ['', 'Jun 2024', '', '', '100', ''], // sisa rumus
  ])
  assert.equal(h.baris.length, 4)
  assert.ok(h.baris.every((b) => b.galat.length > 0))
  assert.match(h.baris[0].galat[0], /salah satu/)
})

test('impor: keterangan kosong diberi nilai bawaan', () => {
  const h = siapkanBaris([HEADER, ['2024-06-01', '', '100', '', '', ''], ['2024-06-02', '', '', '50', '', '']])
  assert.deepEqual(h.baris.map((b) => b.alasan), ['Uang masuk', 'Uang keluar'])
  assert.equal(h.baris[0].galat.length, 0)
})

test('impor: header tidak lengkap menghasilkan pesan jelas', () => {
  assert.match(siapkanBaris([['Nama', 'Umur'], ['a', '1']]).galatUmum, /Tanggal/)
  assert.match(siapkanBaris([HEADER]).galatUmum, /kosong/)
})

test('impor: cariTabel melewati baris judul di atas tabel', () => {
  const t = [['Laporan kas'], [''], HEADER, ['2024-06-01', '', '1', '', '', 'x']]
  const k = cariTabel(t)
  assert.equal(k.mulai, 2)
  assert.equal(siapkanBaris(k.tabel, [], [], k.mulai).baris[0].no, 4)
  assert.equal(cariTabel([['a', 'b'], ['1', '2']]), null)
})

test('impor: excelKeTabel mengubah Date tanpa bergeser hari', () => {
  const t = excelKeTabel([[new Date(Date.UTC(2024, 5, 1)), 100, null]])
  assert.deepEqual(t, [['2024-06-01', '100', '']])
})

test('impor: format ekspor aplikasi sendiri bisa diimpor kembali (cadangan)', () => {
  const csv = '﻿Tanggal;Jenis;Kategori;Jumlah (Rp);Dari;Untuk;Keperluan\r\n' +
    '2026-10-03;Masuk;Sumbangan;50000;Paman Ali;Kas keluarga;Sumbangan sukarela\r\n' +
    '2026-10-10;Keluar;Konsumsi;-175000;Kas keluarga;Toko Berkah;Beli konsumsi\r\n'
  const h = siapkanBaris(parseCsv(csv), [{ id: 'A1', nama: 'Paman Ali' }])
  assert.equal(h.galatUmum, null)
  assert.deepEqual(h.baris.map((b) => [b.tipe, b.jumlah, b.dari, b.ke, b.kategori, b.anggota_id]),
    [['masuk', 50000, 'Paman Ali', null, 'Sumbangan', 'A1'], ['keluar', 175000, null, 'Toko Berkah', 'Konsumsi', null]])
})

test('impor: program harus sudah ada; nama anggota dicocokkan tanpa peduli huruf', () => {
  const t = [['tanggal', 'jenis', 'jumlah', 'dari', 'keterangan', 'program'],
    ['2026-10-03', 'masuk', '1000', 'budi', 'x', 'Santunan'],
    ['2026-10-03', 'masuk', '1000', 'budi', 'x', 'Tidak ada']]
  const h = siapkanBaris(t, [{ id: 'B', nama: 'Budi' }], [{ id: 'P', nama: 'santunan' }])
  assert.equal(h.baris[0].program_id, 'P')
  assert.equal(h.baris[0].anggota_id, 'B')
  assert.match(h.baris[1].galat[0], /belum dibuat/)
})

test('impor: tebakan dari keterangan, dan bisa dimatikan', () => {
  assert.deepEqual(bacaKeterangan('Transfer Dari p/n Sulistyo Dyah', 'masuk'), { dari: 'Sulistyo Dyah', ke: null, kategori: 'Sumbangan' })
  assert.equal(bacaKeterangan('Shodaqoh untuk Trah dari Kel. Wening', 'masuk').dari, 'Kel. Wening')
  assert.equal(bacaKeterangan('Transfer Dari Donatur u/ Omah Joglo', 'masuk').dari, 'Donatur')
  assert.equal(bacaKeterangan('Transfer ke u/n Wartiningsih', 'keluar').ke, 'Wartiningsih')
  assert.equal(bacaKeterangan('Tali Asih untuk Mbah Sugito san Om Rian yang sakit', 'keluar').ke, 'Mbah Sugito san Om Rian')
  assert.deepEqual(bacaKeterangan('SMS Charge Notifikasi', 'keluar'), { dari: null, ke: 'Bank', kategori: 'Lain-lain' })
  assert.equal(bacaKeterangan('Shodaqoh Trah HJS untuk Masjid At-Tarbiyah (+ biaya admin)', 'keluar').ke, 'Masjid At-Tarbiyah')
  assert.deepEqual(bacaKeterangan('Salma', 'keluar'), { dari: null, ke: null, kategori: null })
  const t = [HEADER, ['2024-06-01', '', '300', '', '', 'Dari a/n Wening']]
  assert.equal(siapkanBaris(t, [], [], 0, { tebak: false }).baris[0].dari, null)
  // kolom Dari yang sudah diisi tidak ditimpa
  const t2 = [[...HEADER, 'Dari'], ['2024-06-01', '', '300', '', '', 'Dari a/n Wening', 'Bu Ani']]
  assert.equal(siapkanBaris(t2).baris[0].dari, 'Bu Ani')
})

test('program: ringkasan dan daftar penyumbang', () => {
  const p = { id: 'P', target: 1000 }
  const trx = [
    { program_id: 'P', tipe: 'masuk', jumlah: 300, dari: 'Ani', anggota_id: 'A' },
    { program_id: 'P', tipe: 'masuk', jumlah: 200, dari: 'ani ', anggota_id: 'A' },
    { program_id: 'P', tipe: 'masuk', jumlah: 100, dari: null },
    { program_id: 'P', tipe: 'keluar', jumlah: 150 },
    { program_id: 'Q', tipe: 'masuk', jumlah: 999 },
  ]
  const h = hitungProgram(p, trx)
  assert.deepEqual([h.terkumpul, h.disalurkan, h.sisa, h.persen, h.penyumbang], [600, 150, 450, 60, 2])
  assert.equal(hitungProgram({ id: 'P', target: null }, trx).persen, null)
  assert.equal(hitungProgram({ id: 'P', target: 100 }, trx).persen, 100) // tidak lebih dari 100
  const d = penyumbang(trx.slice(0, 3))
  assert.deepEqual(d.map((x) => [x.nama, x.total, x.kali]), [['Ani', 500, 2], ['Tanpa nama', 100, 1]])
})

test('wa: pesan memuat {URL} dan nominal; tautan di-encode', () => {
  const m = pesanTransaksi({ t: { tipe: 'masuk', jumlah: 50000, dari: 'Ani', alasan: 'x' }, saldo: 1000 })
  assert.match(m, /Rp 50\.000/); assert.match(m, /\{URL\}/)
  assert.match(pesanAjakan({ program: { id: 'P', nama: 'Santunan' }, h: { terkumpul: 0, target: null } }), /sukarela/)
  assert.ok(linkWa('a b&c').startsWith('https://wa.me/?text=a%20b%26c'))
})

test('riwayat: penambahan beruntun digabung, selain itu tetap satuan', () => {
  const mk = (id, aksi, menit) => ({ id, aksi, waktu: new Date(Date.UTC(2026, 9, 18, 0, 60 - menit)).toISOString() })
  const impor = Array.from({ length: 6 }, (_, i) => mk(100 - i, 'tambah', 1 + i * 0.1)) // 6 entri dalam 1 menit
  const logs = [mk(200, 'ubah', 0), ...impor, mk(50, 'tambah', 30), mk(40, 'hapus', 40)]
  const g = kelompokkan(logs)
  assert.deepEqual(g.map((x) => x.jenis), ['satu', 'banyak', 'satu', 'satu'])
  assert.equal(g[1].logs.length, 6)
  // kurang dari 5 penambahan tidak digabung
  assert.deepEqual(kelompokkan(impor.slice(0, 4)).map((x) => x.jenis), ['satu', 'satu', 'satu', 'satu'])
  // jarak > 5 menit memutus kelompok
  const renggang = [mk(3, 'tambah', 0), mk(2, 'tambah', 10), mk(1, 'tambah', 20)]
  assert.equal(kelompokkan(renggang).length, 3)
})
