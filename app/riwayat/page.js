import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { rp, tgl, waktu } from '../../lib/format'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Riwayat perubahan — Kas Keluarga' }

const NAMA = { tambah: 'Ditambahkan', ubah: 'Diubah', hapus: 'Dihapus' }
const LABEL = {
  tanggal: 'Tanggal', tipe: 'Jenis', jumlah: 'Jumlah', dari: 'Dari', ke: 'Untuk',
  alasan: 'Keperluan', kategori: 'Kategori', bukti_path: 'Bukti',
}

const tampil = (k, v) => {
  if (v === null || v === undefined || v === '') return '(kosong)'
  if (k === 'jumlah') return rp(v)
  if (k === 'tanggal') return tgl(v)
  if (k === 'tipe') return v === 'masuk' ? 'Uang masuk' : 'Uang keluar'
  if (k === 'bukti_path') return 'ada foto'
  return String(v)
}

// daftar perbedaan antara data lama dan baru
const beda = (a, b) =>
  Object.keys(LABEL).filter((k) => (a?.[k] ?? null) !== (b?.[k] ?? null))

export default async function Riwayat() {
  const { data, error } = await supabase
    .from('transaksi_log').select('*').order('waktu', { ascending: false }).limit(100)

  return (
    <main>
      <h1>Riwayat perubahan</h1>
      <p>
        Setiap kali bendahara menambah, mengubah, atau menghapus catatan, kejadiannya tercatat otomatis
        di sini dan tidak bisa dihapus. Supaya semua keluarga bisa memantau.
      </p>

      {error && <div className="notif err" role="alert">Riwayat belum bisa dimuat.</div>}
      {!error && !data?.length && <p className="kosong">Belum ada riwayat.</p>}

      {(data ?? []).map((l) => {
        const d = l.data_baru ?? l.data_lama
        return (
          <article key={l.id} className={'kartu log ' + l.aksi}>
            <div className="baris">
              <b>{NAMA[l.aksi]}</b>
              <span>{waktu(l.waktu)}</span>
            </div>
            <p>
              {d.tipe === 'masuk' ? 'Uang masuk' : 'Uang keluar'} {rp(d.jumlah)} — {d.alasan}
              {' '}({tgl(d.tanggal)})
            </p>
            {l.aksi === 'ubah' && (
              <ul>
                {beda(l.data_lama, l.data_baru).map((k) => (
                  <li key={k}>
                    {LABEL[k]}: {tampil(k, l.data_lama[k])} → <b>{tampil(k, l.data_baru[k])}</b>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )
      })}
      <p><Link href="/">Kembali ke halaman utama</Link></p>
    </main>
  )
}
