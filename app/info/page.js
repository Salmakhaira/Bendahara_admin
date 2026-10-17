import Link from 'next/link'
import { ambilPengaturan } from '../../lib/pengaturan'
import Kepala from '../components/Kepala'
import InfoBayar from '../components/InfoBayar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Info — Kas Keluarga' }

export default async function Info() {
  const { data: p, error } = await ambilPengaturan()
  const pengaturan = error ? null : p

  return (
    <>
      <Kepala />
      <main className="wrap sempit">
        <h1>Info</h1>

        <div className="tumpuk">
          <InfoBayar p={pengaturan} kosong />

          {pengaturan?.pengurus && (
            <section className="panel">
              <h2>Pengurus</h2>
              <p className="teks-bebas">{pengaturan.pengurus}</p>
            </section>
          )}

          <section className="panel">
            <h2>Pasang di layar utama HP</h2>
            <p className="redup">Supaya bisa dibuka dengan satu ketukan, seperti aplikasi biasa.</p>
            <ol className="langkah">
              <li><b>Android (Chrome):</b> ketuk menu ⋮ di pojok kanan atas, lalu pilih <b>Tambahkan ke layar utama</b> atau <b>Instal aplikasi</b>.</li>
              <li><b>iPhone (Safari):</b> ketuk tombol <b>Bagikan</b> di bawah layar, lalu pilih <b>Tambah ke Layar Utama</b>.</li>
            </ol>
          </section>

          <section className="panel">
            <h2>Transparansi data</h2>
            <p>
              Semua orang di keluarga bisa melihat saldo dan setiap catatan, tetapi hanya bendahara yang bisa mengubahnya.
              Setiap perubahan tercatat otomatis.
            </p>
            <p className="aksi-baris">
              <Link className="btn kecil garis" href="/riwayat">Riwayat perubahan</Link>
              <a className="btn kecil garis" href="/export">Unduh semua catatan (CSV)</a>
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
