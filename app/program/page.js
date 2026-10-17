import Link from 'next/link'
import { ambilProgram, ambilTrxProgram, hitungProgram } from '../../lib/program'
import Kepala from '../components/Kepala'
import KartuProgram from '../components/KartuProgram'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Program — Kas Keluarga' }

export default async function Program() {
  const [pr, trx] = await Promise.all([ambilProgram(), ambilTrxProgram()])
  const daftar = pr.error ? [] : (pr.data ?? []).map((p) => ({ ...p, h: hitungProgram(p, trx.data ?? []) }))
  const aktif = daftar.filter((p) => p.status === 'aktif')
  const selesai = daftar.filter((p) => p.status === 'selesai')

  return (
    <>
      <Kepala />
      <main className="wrap sempit">
        <h1>Program</h1>
        <p className="pengantar">
          Kas ini berjalan dengan sumbangan sukarela. Setiap program adalah tujuan yang bermanfaat;
          di sini terlihat berapa yang terkumpul dan ke mana uangnya disalurkan.
        </p>
        {pr.error && <div className="notif err" role="alert">Program belum bisa dimuat. Bendahara perlu menjalankan schema.sql terbaru.</div>}
        {!pr.error && daftar.length === 0 && <p className="kosong">Belum ada program.</p>}

        {aktif.length > 0 && (
          <section className="tumpuk" aria-label="Program berjalan">
            <h2 className="sub">Sedang berjalan</h2>
            {aktif.map((p) => <KartuProgram key={p.id} p={p} h={p.h} />)}
          </section>
        )}
        {selesai.length > 0 && (
          <section className="tumpuk" aria-label="Program selesai">
            <h2 className="sub">Sudah selesai</h2>
            {selesai.map((p) => <KartuProgram key={p.id} p={p} h={p.h} />)}
          </section>
        )}
        <p className="jarak"><Link href="/info">Cara berdonasi</Link></p>
      </main>
    </>
  )
}
