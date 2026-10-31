import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { urutan } from '../lib/query'
import { ambilProgram, ambilTrxProgram, hitungProgram, petaNama } from '../lib/program'
import { ambilPengaturan } from '../lib/pengaturan'
import Kepala from './components/Kepala'
import Kartu from './components/Kartu'
import Saldo from './components/Saldo'
import KartuProgram from './components/KartuProgram'

export const dynamic = 'force-dynamic'

export default async function Beranda() {
  const [ringkas, terbaru, prog, trx, pgn] = await Promise.all([
    supabase.from('ringkasan').select('*').single(),
    urutan(supabase.from('transaksi').select('*')).limit(8),
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
      <main className="wrap sempit">
        <h1 className="sr">Kas Keluarga</h1>
        <div className="tumpuk">
          <Saldo r={ringkas.data} />

          <section aria-label="Catatan terbaru">
            <h2>Uang masuk dan keluar terbaru</h2>
            {baris.length > 0 ? (
              <div className="buku jarak">{baris.map((t) => <Kartu key={t.id} t={t} program={namaProgram[t.program_id]} />)}</div>
            ) : (
              <p className="kosong jarak">Belum ada catatan.</p>
            )}
            <Link className="btn blok besar" href="/catatan">Lihat semua catatan</Link>
          </section>

          {aktif.length > 0 && (
            <section aria-label="Program berjalan">
              <h2>Program sumbangan</h2>
              <div className="tumpuk jarak">
                {aktif.slice(0, 3).map((p) => <KartuProgram key={p.id} p={p} h={p.h} />)}
              </div>
            </section>
          )}

          <p className="jaminan">
            Hanya bendahara yang bisa mengubah catatan. Setiap perubahan tercatat di{' '}
            <Link href="/riwayat">riwayat perubahan</Link>.
          </p>
        </div>
      </main>
    </>
  )
}
