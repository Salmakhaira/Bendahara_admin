import { supabase } from './supabase'
import { bulanIni, rentangBulan } from './format'

// ---------- pengambilan data ----------
export const ambilAnggota = () => supabase.from('anggota').select('*').order('nama')

// setoran iuran (transaksi masuk yang ditandai anggota + periode) pada rentang bulan
export const ambilSetoran = (bulanDari, bulanSampai, anggotaId) => {
  let q = supabase
    .from('transaksi')
    .select('id,anggota_id,periode,jumlah,tanggal')
    .eq('tipe', 'masuk')
    .not('periode', 'is', null)
    .gte('periode', bulanDari + '-01')
    .lte('periode', bulanSampai + '-01')
    .order('tanggal', { ascending: false })
  if (anggotaId) q = q.eq('anggota_id', anggotaId)
  return q.limit(1000)
}

// ---------- perhitungan (murni, mudah diuji) ----------
export const ST = { lunas: 'lunas', sebagian: 'sebagian', belum: 'belum' }
export const NAMA_STATUS = { lunas: '✓ Lunas', sebagian: 'Sebagian', belum: 'Belum bayar' }

const awalBulan = (d) => String(d).slice(0, 7)

// Status iuran semua peserta untuk satu bulan.
// Peserta = anggota aktif, iuran > 0, dan sudah mulai ditagih pada bulan itu.
export function statusBulan(anggota, setoran, bulan) {
  const kunci = bulan + '-01'
  const dibayar = new Map()
  for (const s of setoran) {
    if (s.periode === kunci && s.anggota_id) {
      dibayar.set(s.anggota_id, (dibayar.get(s.anggota_id) ?? 0) + Number(s.jumlah))
    }
  }
  const baris = anggota
    .filter((a) => a.aktif && a.iuran_bulanan > 0 && awalBulan(a.mulai_iuran) <= bulan)
    .map((a) => {
      const sudah = dibayar.get(a.id) ?? 0
      const status = sudah >= a.iuran_bulanan ? ST.lunas : sudah > 0 ? ST.sebagian : ST.belum
      return { ...a, dibayar: sudah, kurang: Math.max(0, a.iuran_bulanan - sudah), status }
    })
  const hitung = (st) => baris.filter((b) => b.status === st).length
  const target = baris.reduce((s, b) => s + b.iuran_bulanan, 0)
  const terkumpul = baris.reduce((s, b) => s + Math.min(b.dibayar, b.iuran_bulanan), 0)
  return {
    baris,
    jumlah: baris.length,
    lunas: hitung(ST.lunas),
    sebagian: hitung(ST.sebagian),
    belum: hitung(ST.belum),
    target,
    terkumpul,
    persen: target > 0 ? Math.round((terkumpul / target) * 100) : 0,
  }
}

// Status 12 bulan untuk satu anggota pada satu tahun.
// 'na' = belum waktunya ditagih (sebelum mulai iuran) / 'akan' = bulan yang belum tiba.
export function statusTahun(a, setoran, tahun, sekarang = bulanIni()) {
  return rentangBulan(`${tahun}-01`, `${tahun}-12`).map((bulan) => {
    const sudah = setoran
      .filter((s) => s.anggota_id === a.id && s.periode === bulan + '-01')
      .reduce((t, s) => t + Number(s.jumlah), 0)
    let status
    if (a.iuran_bulanan > 0 && sudah >= a.iuran_bulanan) status = ST.lunas
    else if (sudah > 0) status = ST.sebagian
    else if (a.iuran_bulanan <= 0 || bulan < awalBulan(a.mulai_iuran)) status = 'na'
    else if (bulan > sekarang) status = 'akan'
    else status = ST.belum
    return { bulan, dibayar: sudah, status }
  })
}
