'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { rp, tgl, bulanLabel } from '../../../lib/format'
import { bacaFilter, terapkanFilter, urutan } from '../../../lib/query'
import Kartu from '../../components/Kartu'

const PER = 30

export default function CatatanAdmin() {
  const [isian, setIsian] = useState({ bulan: '', tipe: '', q: '' })
  const [filter, setFilter] = useState({ bulan: '', tipe: '', q: '' })
  const [bulanList, setBulanList] = useState([])
  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [batas, setBatas] = useState(PER)
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)

  const muat = useCallback(async () => {
    const l = await terapkanFilter(
      urutan(supabase.from('transaksi').select('*', { count: 'exact' })), bacaFilter(filter)
    ).limit(batas)
    if (l.error) return setPesan({ jenis: 'err', teks: 'Daftar catatan gagal dimuat. Coba muat ulang halaman.' })
    setDaftar(l.data)
    setTotal(l.count ?? l.data.length)
  }, [filter, batas])

  useEffect(() => { muat() }, [muat])
  useEffect(() => {
    supabase.from('ringkasan_bulanan').select('bulan').order('bulan', { ascending: false })
      .then(({ data }) => setBulanList((data ?? []).map((b) => String(b.bulan).slice(0, 7))))
  }, [])

  const cari = (e) => { e.preventDefault(); setBatas(PER); setFilter(isian) }
  const adaFilter = filter.bulan || filter.tipe || filter.q

  async function hapus(t) {
    const yakin = window.confirm(
      `Hapus catatan ini?\n\n${t.tipe === 'masuk' ? 'Masuk' : 'Keluar'} ${rp(t.jumlah)} — ${t.alasan}\n${tgl(t.tanggal)}\n\n` +
      'Penghapusan tetap tercatat di Riwayat perubahan.'
    )
    if (!yakin) return
    setSibuk(true)
    const { data, error } = await supabase.from('transaksi').delete().eq('id', t.id).select()
    if (error || !data?.length) {
      setPesan({ jenis: 'err', teks: 'Gagal menghapus' + (error ? ': ' + error.message : '.') })
    } else {
      if (t.bukti_path) await supabase.storage.from('bukti').remove([t.bukti_path])
      setPesan({ jenis: 'ok', teks: 'Catatan dihapus.' })
      await muat()
    }
    setSibuk(false)
  }

  return (
    <main className="wrap">
      <div className="alat">
        <h1>Semua catatan</h1>
        <Link className="btn kecil" href="/bendahara/catat">+ Catat transaksi</Link>
      </div>

      <form className="panel filter" onSubmit={cari}>
        <label className="f">Bulan
          <select value={isian.bulan} onChange={(e) => setIsian({ ...isian, bulan: e.target.value })}>
            <option value="">Semua bulan</option>
            {bulanList.map((b) => <option key={b} value={b}>{bulanLabel(b)}</option>)}
          </select>
        </label>
        <label className="f">Jenis
          <select value={isian.tipe} onChange={(e) => setIsian({ ...isian, tipe: e.target.value })}>
            <option value="">Semua</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
        </label>
        <label className="f cari">Cari
          <input value={isian.q} maxLength={60} placeholder="Nama, keperluan, atau kategori" onChange={(e) => setIsian({ ...isian, q: e.target.value })} />
        </label>
        <div className="filter-aksi">
          <button className="btn">Tampilkan</button>
          {adaFilter && (
            <button type="button" className="btn garis" onClick={() => { const k = { bulan: '', tipe: '', q: '' }; setIsian(k); setFilter(k); setBatas(PER) }}>Hapus pilihan</button>
          )}
        </div>
      </form>

      {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      <p className="hitung">Menampilkan {daftar.length} dari {total} catatan</p>

      {daftar.length > 0 ? (
        <div className="buku">
          {daftar.map((t) => (
            <Kartu
              key={t.id}
              t={t}
              aksi={
                <>
                  <Link className="btn kecil garis" href={`/bendahara/catat?ubah=${t.id}`}>Ubah</Link>
                  <button type="button" className="btn kecil bahaya" onClick={() => hapus(t)} disabled={sibuk}>Hapus</button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <p className="kosong">{adaFilter ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan.'}</p>
      )}
      {daftar.length < total && (
        <button type="button" className="btn garis blok" onClick={() => setBatas((b) => b + PER)}>Tampilkan lebih banyak</button>
      )}
    </main>
  )
}
