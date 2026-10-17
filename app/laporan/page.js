import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { rp, bulanLabel } from '../../lib/format'
import Kepala from '../components/Kepala'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan — Kas Keluarga' }

export default async function Laporan() {
  const { data, error } = await supabase.from('ringkasan_bulanan').select('*').order('bulan', { ascending: true })

  // saldo akhir tiap bulan = akumulasi dari bulan-bulan sebelumnya
  let berjalan = 0
  const bulan = (data ?? []).map((b) => {
    berjalan += b.masuk - b.keluar
    return { ...b, akhir: berjalan, kunci: String(b.bulan).slice(0, 7) }
  }).reverse()

  return (
    <>
      <Kepala />
      <main className="wrap sempit">
        <h1>Laporan</h1>
        <p className="pengantar">
          Laporan bulanan siap cetak atau disimpan sebagai PDF untuk dibagikan ke keluarga.
        </p>

        {error && <div className="notif err" role="alert">Laporan belum bisa dimuat. Coba muat ulang halaman.</div>}
        {!error && bulan.length === 0 && <p className="kosong">Belum ada catatan, jadi belum ada laporan.</p>}

        <div className="buku">
          {bulan.map((b) => (
            <article key={b.kunci} className="lap-baris">
              <div className="lap-judul">
                <h2>{bulanLabel(b.kunci)}</h2>
                <small>{b.jumlah_catatan} catatan</small>
              </div>
              <dl className="lap-angka">
                <div><dt>Masuk</dt><dd className="m">{rp(b.masuk)}</dd></div>
                <div><dt>Keluar</dt><dd className="k">{rp(b.keluar)}</dd></div>
                <div><dt>Saldo akhir</dt><dd>{rp(b.akhir)}</dd></div>
              </dl>
              <div className="lap-aksi">
                <Link className="btn kecil" href={`/laporan/${b.kunci}`}>Buka laporan</Link>
                <a className="btn kecil garis" href={`/export?bulan=${b.kunci}`}>Unduh CSV</a>
              </div>
            </article>
          ))}
        </div>

        <h2 className="sub">Transparansi</h2>
        <p>
          Semua penambahan, perubahan, dan penghapusan catatan tercatat otomatis dan tidak bisa dihapus.{' '}
          <Link href="/riwayat">Lihat riwayat perubahan</Link>.
        </p>
      </main>
    </>
  )
}
