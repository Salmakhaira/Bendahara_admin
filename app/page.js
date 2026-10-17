import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { urutan } from '../lib/query'
import { ambilProgram, ambilTrxProgram, hitungProgram, petaNama } from '../lib/program'
import { ambilPengaturan } from '../lib/pengaturan'
import { pesanRingkasan } from '../lib/wa'
import Kepala from './components/Kepala'
import Kartu from './components/Kartu'
import Saldo from './components/Saldo'
import KartuProgram from './components/KartuProgram'
import InfoBayar from './components/InfoBayar'
import BagikanWa from './components/BagikanWa'

export const dynamic = 'force-dynamic'

export default async function Beranda() {
  const [ringkas, terbaru, prog, trx, pgn] = await Promise.all([
    supabase.from('ringkasan').select('*').single(),
    urutan(supabase.from('transaksi').select('*')).limit(6),
    ambilProgram(),
    ambilTrxProgram(),
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

  // Program bersifat tambahan: jika tabelnya belum ada, halaman tetap jalan.
  const aktif = prog.error ? [] : (prog.data ?? []).filter((p) => p.status === 'aktif').map((p) => ({ ...p, h: hitungProgram(p, trx.data ?? []) }))
  const namaProgram = petaNama(prog.data ?? [])
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
            {aktif.length > 0 && (
              <section aria-label="Program berjalan">
                <div className="alat">
                  <h2>Program berjalan</h2>
                  <Link className="btn kecil garis" href="/program">Semua program</Link>
                </div>
                <div className="tumpuk jarak">
                  {aktif.slice(0, 3).map((p) => <KartuProgram key={p.id} p={p} h={p.h} />)}
                </div>
              </section>
            )}
            <InfoBayar p={p} />

            <section aria-label="Catatan terbaru">
              <div className="alat">
                <h2>Catatan terbaru</h2>
                <Link className="btn kecil garis" href="/catatan">Lihat semua</Link>
              </div>
              {baris.length > 0 ? (
                <div className="buku jarak">{baris.map((t) => <Kartu key={t.id} t={t} program={namaProgram[t.program_id]} />)}</div>
              ) : (
                <p className="kosong jarak">Belum ada catatan.</p>
              )}
            </section>

            <div className="alat-btn">
              <BagikanWa
                label="Bagikan ringkasan ke WhatsApp"
                teks={pesanRingkasan({ namaKas: p?.nama_kas, saldo: ringkas.data?.saldo, program: aktif })}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
