// Logika filter yang dipakai bersama oleh halaman utama dan ekspor CSV.

const satu = (v) => (Array.isArray(v) ? v[0] : v) || ''

export function bacaFilter(sp = {}) {
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(satu(sp.bulan)) ? satu(sp.bulan) : ''
  const tipe = ['masuk', 'keluar'].includes(satu(sp.tipe)) ? satu(sp.tipe) : ''
  // buang karakter yang punya arti khusus pada filter PostgREST
  const q = satu(sp.q).replace(/[,()%*\\:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  return { bulan, tipe, q }
}

export function terapkanFilter(query, { bulan, tipe, q }) {
  if (bulan) {
    const [y, m] = bulan.split('-').map(Number)
    const berikut = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    query = query.gte('tanggal', `${bulan}-01`).lt('tanggal', berikut)
  }
  if (tipe) query = query.eq('tipe', tipe)
  if (q) {
    query = query.or(
      ['alasan', 'dari', 'ke', 'kategori'].map((k) => `${k}.ilike.%${q}%`).join(',')
    )
  }
  return query
}

export const urutan = (query) =>
  query.order('tanggal', { ascending: false }).order('dibuat_pada', { ascending: false })

// bangun query-string dari filter (abaikan yang kosong)
export const qs = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => v && p.set(k, v))
  const s = p.toString()
  return s ? '?' + s : ''
}
