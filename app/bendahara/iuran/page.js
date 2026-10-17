'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ambilAnggota, ambilSetoran, statusBulan, NAMA_STATUS } from '../../../lib/iuran'
import { ambilPengaturan, adaInfoBayar } from '../../../lib/pengaturan'
import { bulanIni, bulanLabel, geserBulan, rp } from '../../../lib/format'
import { pesanPengingat } from '../../../lib/wa'
import BagikanWa from '../../components/BagikanWa'

export default function IuranAdmin() {
  const [bulan, setBulan] = useState(bulanIni())
  const [d, setD] = useState(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    setD(null)
    Promise.all([ambilAnggota(), ambilSetoran(bulan, bulan), ambilPengaturan()]).then(([a, s, p]) => {
      if (a.error) return setGalat('Data anggota belum bisa dimuat. Pastikan schema.sql terbaru sudah dijalankan.')
      setGalat('')
      setD({ st: statusBulan(a.data, s.data ?? [], bulan), p: p.data })
    })
  }, [bulan])

  if (galat) return <main className="wrap sempit"><div className="notif err" role="alert">{galat}</div></main>

  const st = d?.st
  const urut = st ? [...st.baris].sort((a, b) => (a.status === 'lunas') - (b.status === 'lunas') || a.nama.localeCompare(b.nama, 'id')) : []
  const belum = st ? st.baris.filter((b) => b.status !== 'lunas') : []
  const p = d?.p

  return (
    <main className="wrap">
      <div className="alat">
        <h1>Iuran anggota</h1>
        <div className="bulan-nav">
          <button type="button" className="btn kecil garis" onClick={() => setBulan(geserBulan(bulan, -1))} aria-label="Bulan sebelumnya">‹</button>
          <strong>{bulanLabel(bulan)}</strong>
          <button type="button" className="btn kecil garis" onClick={() => setBulan(geserBulan(bulan, 1))} aria-label="Bulan berikutnya">›</button>
        </div>
      </div>
      {!st ? <p>Memuat...</p> : st.jumlah === 0 ? (
        <p className="kosong">Belum ada anggota dengan iuran. <Link href="/bendahara/anggota">Atur anggota</Link></p>
      ) : (
        <div className="tata admin">
          <aside className="samping">
            <section className="panel">
              <p className="besar"><b>{st.lunas}</b> dari {st.jumlah} anggota lunas</p>
              <div className="batang iuran"><span className="sisa" style={{ width: st.persen + '%' }} /></div>
              <p>Terkumpul {rp(st.terkumpul)} dari {rp(st.target)}</p>
            </section>
            {belum.length > 0 && (
              <BagikanWa
                kelas="btn garis blok" label="Kirim pengingat ke WhatsApp"
                teks={pesanPengingat({ namaKas: p?.nama_kas, bulan, belum, info: adaInfoBayar(p) && p.no_rekening ? `Transfer ke ${p.bank ?? 'rekening'} ${p.no_rekening}${p.atas_nama ? ' a.n. ' + p.atas_nama : ''}` : '' })}
              />
            )}
          </aside>
          <div className="utama">
            <div className="buku">
              {urut.map((b) => (
                <div key={b.id} className="ang tetap">
                  <div className="ang-nama">
                    <strong>{b.nama}</strong>
                    <small>{b.status === 'lunas' ? rp(b.dibayar) : b.status === 'sebagian' ? `Dibayar ${rp(b.dibayar)}, kurang ${rp(b.kurang)}` : `Iuran ${rp(b.iuran_bulanan)}`}</small>
                  </div>
                  <div className="ang-status"><span className={'chip ' + b.status}>{NAMA_STATUS[b.status]}</span></div>
                  {b.status !== 'lunas' && <Link className="btn kecil" href={`/bendahara/catat?anggota=${b.id}&bulan=${bulan}`}>Catat bayar</Link>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
