import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { bulanIni } from '../lib/format'
import { urutan } from '../lib/query'
import { ambilAnggota, ambilSetoran, statusBulan } from '../lib/iuran'
import { ambilPengaturan } from '../lib/pengaturan'
import { pesanRingkasan } from '../lib/wa'
import Kepala from './components/Kepala'
import Kartu from './components/Kartu'
import Saldo from './components/Saldo'
import KartuIuran from './components/KartuIuran'
import InfoBayar from './components/InfoBayar'
import BagikanWa from './components/BagikanWa'

export const dynamic = 'force-dynamic'

export default async function Beranda() {
  const bulan = bulanIni()
  const [ringkas, terbaru, anggota, setoran, pgn] = await Promise.all([
    supabase.from('ringkasan').select('*').single(),
    urutan(supabase.from('transaksi').select('*')).limit(6),
    ambilAnggota(),
    ambilSetoran(bulan, bulan),
    ambilPengaturan(),
  ])

  if (ringkas.error || terbaru.error) {
    return (
      <>
        <Kepala />
        <main className="wrap sempit">
          <h1>Data belum bisa dimuat</h1>
          <div className="notif err" role="alert">
            Muat ulang halaman beberapa saat lagi. Jika terus terjadi, hubungi bendahara.
          </div>
        </main>
      </>
    )
  }

  // Fitur iuran bersifat tambahan: jika tabelnya belum ada, halaman tetap jalan.
  const st = anggota.error ? null : statusBulan(anggota.data ?? [], setoran.data ?? [], bulan)
  const p = pgn.error ? null : pgn.data
  const baris = terbaru.data ?? []

  return (
    <>
      <Kepala />
      <main className="wrap">
        <h1 className="sr">Kas Keluarga</h1>
        <div className="tata">
          <aside className="samping">
            <Saldo r={ringkas.data} />
            <p className="jaminan">
              Hanya bendahara yang bisa mengubah catatan. Setiap perubahan tercatat di{' '}
              <Link href="/riwayat">riwayat perubahan</Link>.
            </p>
          </aside>

          <div className="utama tumpuk">
            <KartuIuran bulan={bulan} st={st} />
            <InfoBayar p={p} />

            <section aria-label="Catatan terbaru">
              <div className="alat">
                <h2>Catatan terbaru</h2>
                <Link className="btn kecil garis" href="/catatan">Lihat semua</Link>
              </div>
              {baris.length > 0 ? (
                <div className="buku jarak">{baris.map((t) => <Kartu key={t.id} t={t} />)}</div>
              ) : (
                <p className="kosong jarak">Belum ada catatan.</p>
              )}
            </section>

            <div className="alat-btn">
              <BagikanWa
                label="Bagikan ringkasan ke WhatsApp"
                teks={pesanRingkasan({ namaKas: p?.nama_kas, saldo: ringkas.data?.saldo, bulan, iuran: st })}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
