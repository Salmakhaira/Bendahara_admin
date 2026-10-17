'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { urutan } from '../../lib/query'
import { ambilAnggota, ambilProgram, ambilTrxProgram, hitungProgram, petaNama } from '../../lib/program'
import { ambilPengaturan, adaInfoBayar } from '../../lib/pengaturan'
import { pesanRingkasan } from '../../lib/wa'
import Saldo from '../components/Saldo'
import Kartu from '../components/Kartu'
import KartuProgram from '../components/KartuProgram'
import BagikanWa from '../components/BagikanWa'
import { useSesi } from './Sesi'

export default function Ringkasan() {
  const { email } = useSesi()
  const [d, setD] = useState(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('ringkasan').select('*').single(),
      urutan(supabase.from('transaksi').select('*')).limit(5),
      ambilAnggota(),
      ambilProgram(),
      ambilTrxProgram(),
      ambilPengaturan(),
    ]).then(([r, t, a, pr, trx, p]) => {
      if (r.error || t.error) return setGalat('Data gagal dimuat. Coba muat ulang halaman.')
      // tabel program/pengaturan mungkin belum ada (schema.sql belum dijalankan ulang)
      setD({
        ringkas: r.data,
        terbaru: t.data,
        adaTabel: !pr.error,
        anggota: a.error ? [] : a.data,
        program: pr.error ? [] : pr.data.map((x) => ({ ...x, h: hitungProgram(x, trx.data ?? []) })),
        p: p.error ? null : p.data,
      })
    })
  }, [])

  if (galat) return <main className="wrap sempit"><div className="notif err" role="alert">{galat}</div></main>
  if (!d) return <main className="wrap sempit"><p>Memuat...</p></main>

  const { ringkas, terbaru, program, p, anggota, adaTabel } = d
  const aktif = program.filter((x) => x.status === 'aktif')
  const nama = petaNama(program)
  const langkah = [
    [program.length > 0, 'Buat program sumbangan pertama', '/bendahara/program'],
    [adaInfoBayar(p), 'Isi info pembayaran (rekening)', '/bendahara/pengaturan'],
    [anggota.length > 0, 'Tambahkan daftar nama keluarga', '/bendahara/anggota'],
    [terbaru.length > 0, 'Catat transaksi pertama atau impor catatan lama', '/bendahara/impor'],
  ]
  const baruMulai = langkah.some(([ok]) => !ok)

  return (
    <main className="wrap">
      <h1 className="sr">Ringkasan bendahara</h1>
      <div className="tata admin">
        <aside className="samping">
          <Saldo r={ringkas} akun={'Masuk sebagai ' + email} />
          <Link className="btn blok besar" href="/bendahara/catat">+ Catat transaksi</Link>
          <BagikanWa
            kelas="btn garis blok"
            label="Bagikan ringkasan ke WhatsApp"
            teks={pesanRingkasan({ namaKas: p?.nama_kas, saldo: ringkas.saldo, program: aktif })}
          />
        </aside>

        <div className="utama tumpuk">
          {(baruMulai || !adaTabel) && (
            <section className="panel mulai">
              <h2>Langkah awal</h2>
              {!adaTabel && <div className="notif info">Fitur program belum aktif. Jalankan <code>schema.sql</code> terbaru di Supabase, lalu muat ulang halaman ini.</div>}
              <ul className="cek">
                {langkah.map(([ok, teks, href]) => (
                  <li key={href} className={ok ? 'selesai' : ''}>
                    <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                    {ok ? <span>{teks}</span> : <Link href={href}>{teks}</Link>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aktif.length > 0 && (
            <section aria-label="Program berjalan">
              <div className="alat">
                <h2>Program berjalan</h2>
                <Link className="btn kecil garis" href="/bendahara/program">Kelola program</Link>
              </div>
              <div className="tumpuk jarak">
                {aktif.slice(0, 4).map((x) => (
                  <KartuProgram
                    key={x.id} p={x} h={x.h} href={`/program/${x.id}`}
                    aksi={<Link className="btn kecil" href={`/bendahara/catat?program=${x.id}`}>+ Catat sumbangan</Link>}
                  />
                ))}
              </div>
            </section>
          )}

          <section aria-label="Catatan terakhir">
            <div className="alat">
              <h2>Catatan terakhir</h2>
              <Link className="btn kecil garis" href="/bendahara/catatan">Lihat semua</Link>
            </div>
            {terbaru.length > 0 ? (
              <div className="buku jarak">
                {terbaru.map((t) => (
                  <Kartu key={t.id} t={t} program={nama[t.program_id]} aksi={<Link className="btn kecil garis" href={`/bendahara/catat?ubah=${t.id}`}>Ubah</Link>} />
                ))}
              </div>
            ) : (
              <p className="kosong jarak">Belum ada catatan. Mulai dengan menekan <b>+ Catat transaksi</b>.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
