import { supabase } from './supabase'

// ---------- pengambilan data ----------
export const ambilAnggota = () => supabase.from('anggota').select('*').order('nama')
export const ambilProgram = () =>
  supabase.from('program').select('*').order('status', { ascending: true }).order('dibuat_pada', { ascending: false })

// Transaksi yang ditandai program (semua program, atau satu program). Dibaca per 1000 baris.
export async function ambilTrxProgram(programId) {
  const hasil = []
  for (let dari = 0; dari < 20000; dari += 1000) {
    let q = supabase
      .from('transaksi')
      .select('id,program_id,anggota_id,tipe,jumlah,dari,tanggal')
      .not('program_id', 'is', null)
      .order('tanggal', { ascending: false })
    if (programId) q = q.eq('program_id', programId)
    const { data, error } = await q.range(dari, dari + 999)
    if (error) return { data: null, error }
    hasil.push(...data)
    if (data.length < 1000) break
  }
  return { data: hasil, error: null }
}

// ---------- perhitungan (murni, mudah diuji) ----------
// Ringkasan satu program: terkumpul (uang masuk), disalurkan (uang keluar), sisa dana,
// persen terhadap target (null jika tanpa target), dan jumlah penyumbang berbeda.
export function hitungProgram(program, trx) {
  const milik = trx.filter((t) => t.program_id === program.id)
  const masuk = milik.filter((t) => t.tipe === 'masuk')
  const jumlah = (l) => l.reduce((s, t) => s + Number(t.jumlah), 0)
  const terkumpul = jumlah(masuk)
  const disalurkan = jumlah(milik.filter((t) => t.tipe === 'keluar'))
  const target = program.target ? Number(program.target) : null
  return {
    terkumpul,
    disalurkan,
    sisa: terkumpul - disalurkan,
    target,
    persen: target ? Math.min(100, Math.round((terkumpul / target) * 100)) : null,
    penyumbang: penyumbang(masuk).length,
    jumlahCatatan: milik.length,
  }
}

// Daftar penyumbang dari transaksi masuk, diurutkan dari yang terbanyak.
// Dikelompokkan per anggota (jika ada), kalau tidak per nama yang diketik.
export function penyumbang(masuk) {
  const peta = new Map()
  for (const t of masuk) {
    const nama = (t.dari ?? '').trim() || 'Tanpa nama'
    const kunci = t.anggota_id || nama.toLowerCase()
    const d = peta.get(kunci) ?? { nama, total: 0, kali: 0 }
    d.total += Number(t.jumlah)
    d.kali += 1
    peta.set(kunci, d)
  }
  return [...peta.values()].sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama, 'id'))
}

export const petaNama = (daftar = []) => Object.fromEntries(daftar.map((p) => [p.id, p.nama]))
