import { supabase } from '../../lib/supabase'
import { bacaFilter, terapkanFilter, urutan } from '../../lib/query'

export const dynamic = 'force-dynamic'

// Cegah "CSV injection": sel yang diawali = + - @ akan dibaca Excel sebagai rumus
const sel = (v) => {
  let s = v === null || v === undefined ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s // angka tidak perlu
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export async function GET(req) {
  const filter = bacaFilter(Object.fromEntries(new URL(req.url).searchParams))

  const baris = []
  for (let dari = 0; dari < 20000; dari += 1000) {
    const { data, error } = await terapkanFilter(urutan(supabase.from('transaksi').select('*')), filter)
      .range(dari, dari + 999)
    if (error) return new Response('Gagal memuat data', { status: 500 })
    baris.push(...data)
    if (data.length < 1000) break
  }

  const kepala = ['Tanggal', 'Jenis', 'Kategori', 'Jumlah (Rp)', 'Dari', 'Untuk', 'Keperluan']
  const isi = baris.map((t) =>
    [
      t.tanggal, t.tipe === 'masuk' ? 'Masuk' : 'Keluar', t.kategori,
      t.tipe === 'masuk' ? t.jumlah : -t.jumlah,
      t.dari || 'Kas keluarga', t.ke || 'Kas keluarga', t.alasan,
    ].map(sel).join(';')
  )

  // BOM + titik-koma agar langsung rapi di Excel versi Indonesia
  const csv = '﻿' + [kepala.join(';'), ...isi].join('\r\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="kas-keluarga.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
