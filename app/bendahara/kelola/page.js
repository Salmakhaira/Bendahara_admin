'use client'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const KARTU = [
  ['/bendahara/program', 'Program sumbangan', 'Tujuan sumbangan dan target dana'],
  ['/bendahara/anggota', 'Daftar nama keluarga', 'Untuk memilih nama penyumbang dengan cepat'],
  ['/bendahara/pengaturan', 'Pengaturan', 'Rekening, nama kas, pengurus'],
  ['/bendahara/impor', 'Impor catatan lama', 'Masukkan catatan dari file CSV/Excel'],
  ['/riwayat', 'Riwayat perubahan', 'Siapa mengubah apa dan kapan'],
  ['/', 'Lihat sebagai keluarga', 'Tampilan yang dilihat anggota'],
]

export default function Kelola() {
  return (
    <main className="wrap sempit">
      <h1>Kelola</h1>
      <div className="buku">
        {KARTU.map(([href, judul, ket]) => (
          <Link key={href} href={href} className="lap-baris">
            <span className="lap-judul"><strong>{judul}</strong><small>{ket}</small></span>
            <span className="panah" aria-hidden="true">›</span>
          </Link>
        ))}
        <a className="lap-baris" href="/export"><span className="lap-judul"><strong>Unduh cadangan (CSV)</strong><small>Semua catatan, bisa dibuka di Excel</small></span><span className="panah" aria-hidden="true">↓</span></a>
      </div>
      <button type="button" className="btn garis blok jarak" onClick={() => supabase.auth.signOut()}>Keluar</button>
    </main>
  )
}
