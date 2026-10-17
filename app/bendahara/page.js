'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { bulanIni, bulanLabel, rp } from '../../lib/format'
import { urutan } from '../../lib/query'
import { ambilAnggota, ambilSetoran, statusBulan, NAMA_STATUS } from '../../lib/iuran'
import { ambilPengaturan, adaInfoBayar } from '../../lib/pengaturan'
import { pesanRingkasan, pesanPengingat } from '../../lib/wa'
import Saldo from '../components/Saldo'
import Kartu from '../components/Kartu'
import BagikanWa from '../components/BagikanWa'
import { useSesi } from './Sesi'

export default function Ringkasan() {
  const { email } = useSesi()
  const bulan = bulanIni()
  const [d, setD] = useState(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('ringkasan').select('*').single(),
      urutan(supabase.from('transaksi').select('*')).limit(5),
      ambilAnggota(),
      ambilSetoran(bulan, bulan),
      ambilPengaturan(),
    ]).then(([r, t, a, s, p]) => {
      if (r.error || t.error) return setGalat('Data gagal dimuat. Coba muat ulang halaman.')
      // tabel iuran/pengaturan mungkin belum ada (schema.sql belum dijalankan ulang)
      setD({
        ringkas: r.data,
        terbaru: t.data,
        anggotaAda: !a.error,
        anggota: a.error ? [] : a.data,
        st: a.error ? null : statusBulan(a.data, s.data ?? [], bulan),
        p: p.error ? null : p.data,
      })
    })
  }, [bulan])

  if (galat) return <main className="wrap sempit"><div className="notif err" role="alert">{galat}</div></main>
  if (!d) return <main className="wrap sempit"><p>Memuat...</p></main>

  const { ringkas, terbaru, st, p, anggota, anggotaAda } = d
  const tagih = st ? st.baris.filter((b) => b.status !== 'lunas').sort((a, b) => a.nama.localeCompare(b.nama, 'id')) : []
  const langkah = [
    [anggota.length > 0, 'Tambahkan anggota dan nominal iuran', '/bendahara/anggota'],
    [adaInfoBayar(p), 'Isi info pembayaran (rekening, jatuh tempo)', '/bendahara/pengaturan'],
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
            teks={pesanRingkasan({ namaKas: p?.nama_kas, saldo: ringkas.saldo, bulan, iuran: st })}
          />
        </aside>

        <div className="utama tumpuk">
          {(baruMulai || !anggotaAda) && (
            <section className="panel mulai">
              <h2>Langkah awal</h2>
              {!anggotaAda && <div className="notif info">Fitur iuran belum aktif. Jalankan <code>schema.sql</code> terbaru di Supabase, lalu muat ulang halaman ini.</div>}
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

          {st && st.jumlah > 0 && (
            <section className="panel" aria-label="Iuran bulan ini">
              <div className="alat">
                <h2>Perlu ditagih · {bulanLabel(bulan)}</h2>
                <Link className="btn kecil garis" href="/bendahara/iuran">Semua anggota</Link>
              </div>
              <p className="besar"><b>{st.lunas}</b> dari {st.jumlah} anggota sudah lunas · terkumpul {rp(st.terkumpul)} dari {rp(st.target)}</p>
              {tagih.length === 0 ? (
                <p className="notif ok">Semua iuran bulan ini sudah lunas. 🎉</p>
              ) : (
                <>
                  <div className="buku jarak">
                    {tagih.slice(0, 8).map((b) => (
                      <div key={b.id} className="ang tetap">
                        <div className="ang-nama">
                          <strong>{b.nama}</strong>
                          <small>{b.status === 'sebagian' ? `Kurang ${rp(b.kurang)}` : `Iuran ${rp(b.iuran_bulanan)}`}</small>
                        </div>
                        <div className="ang-status"><span className={'chip ' + b.status}>{NAMA_STATUS[b.status]}</span></div>
                        <Link className="btn kecil" href={`/bendahara/catat?anggota=${b.id}&bulan=${bulan}`}>Catat bayar</Link>
                      </div>
                    ))}
                  </div>
                  {tagih.length > 8 && <p className="hitung">dan {tagih.length - 8} anggota lainnya.</p>}
                  <div className="alat-btn jarak">
                    <BagikanWa
                      label="Kirim pengingat ke WhatsApp"
                      teks={pesanPengingat({ namaKas: p?.nama_kas, bulan, belum: tagih, info: adaInfoBayar(p) && p.no_rekening ? `Transfer ke ${p.bank ?? 'rekening'} ${p.no_rekening}${p.atas_nama ? ' a.n. ' + p.atas_nama : ''}` : '' })}
                    />
                  </div>
                </>
              )}
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
                  <Kartu key={t.id} t={t} aksi={<Link className="btn kecil garis" href={`/bendahara/catat?ubah=${t.id}`}>Ubah</Link>} />
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
