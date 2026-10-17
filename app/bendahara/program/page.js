'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { ambilProgram, ambilTrxProgram, hitungProgram } from '../../../lib/program'
import KartuProgram from '../../components/KartuProgram'

const digit = (s) => String(s ?? '').replace(/\D/g, '').slice(0, 13)
const titik = (s) => (s ? Number(s).toLocaleString('id-ID') : '')
const KOSONG = { nama: '', deskripsi: '', target: '' }

export default function ProgramAdmin() {
  const [daftar, setDaftar] = useState([])
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)
  const [baru, setBaru] = useState(KOSONG)
  const [ubah, setUbah] = useState(null)

  const info = (jenis, teks) => setPesan({ jenis, teks })
  const muat = useCallback(async () => {
    const [pr, trx] = await Promise.all([ambilProgram(), ambilTrxProgram()])
    if (pr.error) return info('err', 'Program belum bisa dimuat. Pastikan schema.sql terbaru sudah dijalankan.')
    setDaftar(pr.data.map((p) => ({ ...p, h: hitungProgram(p, trx.data ?? []) })))
  }, [])
  useEffect(() => { muat() }, [muat])

  const galatDb = (error, awal) => (error.code === '23505' ? 'Nama program itu sudah ada.' : awal + error.message)

  async function tambah(e) {
    e.preventDefault()
    const nama = baru.nama.trim()
    if (!nama) return info('err', 'Nama program belum diisi.')
    setSibuk(true)
    const { error } = await supabase.from('program').insert({
      nama, deskripsi: baru.deskripsi.trim() || null, target: baru.target ? Number(baru.target) : null,
    })
    setSibuk(false)
    if (error) return info('err', galatDb(error, 'Gagal menambah: '))
    setBaru(KOSONG); info('ok', `Program "${nama}" dibuat.`); muat()
  }

  async function simpanUbah(e) {
    e.preventDefault()
    const nama = ubah.nama.trim()
    if (!nama) return info('err', 'Nama program tidak boleh kosong.')
    setSibuk(true)
    const { error } = await supabase.from('program').update({
      nama, deskripsi: ubah.deskripsi?.trim() || null, target: ubah.target ? Number(ubah.target) : null,
    }).eq('id', ubah.id)
    setSibuk(false)
    if (error) return info('err', galatDb(error, 'Gagal menyimpan: '))
    setUbah(null); info('ok', 'Perubahan disimpan.'); muat()
  }

  async function ubahStatus(p) {
    const status = p.status === 'aktif' ? 'selesai' : 'aktif'
    const { error } = await supabase.from('program').update({ status }).eq('id', p.id)
    if (error) return info('err', 'Gagal mengubah status: ' + error.message)
    info('ok', status === 'selesai' ? `"${p.nama}" ditandai selesai.` : `"${p.nama}" dibuka kembali.`); muat()
  }

  async function hapus(p) {
    if (!window.confirm(`Hapus program "${p.nama}"?\nCatatan transaksinya tetap ada, hanya tidak lagi ditandai program ini. Kalau program sudah tuntas, lebih baik tandai selesai.`)) return
    const { error } = await supabase.from('program').delete().eq('id', p.id)
    if (error) return info('err', 'Gagal menghapus: ' + error.message)
    info('ok', 'Program dihapus.'); muat()
  }

  const Isian = ({ v, set }) => (
    <>
      <label className="f">Nama program<input value={v.nama} onChange={(e) => set({ ...v, nama: e.target.value })} placeholder="Contoh: Santunan sakit" autoComplete="off" /></label>
      <label className="f">Penjelasan singkat <small>boleh kosong</small><textarea rows={3} value={v.deskripsi ?? ''} onChange={(e) => set({ ...v, deskripsi: e.target.value })} /></label>
      <label className="f">Target dana (Rp) <small>boleh kosong jika tanpa target</small>
        <input inputMode="numeric" value={titik(v.target)} onChange={(e) => set({ ...v, target: digit(e.target.value) })} /></label>
    </>
  )

  return (
    <main className="wrap">
      <div className="alat"><h1>Program sumbangan</h1><Link className="btn kecil garis" href="/bendahara/kelola">‹ Kelola</Link></div>
      <p className="pengantar">Program adalah tujuan sumbangan sukarela, misalnya santunan atau renovasi musala. Tidak ada kewajiban atau tagihan.</p>
      {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      <div className="tata admin">
        <aside className="samping">
          <form className="panel form" onSubmit={tambah}>
            <h2>Program baru</h2>
            <Isian v={baru} set={setBaru} />
            <button className="btn" disabled={sibuk}>Buat program</button>
          </form>
        </aside>
        <div className="utama tumpuk">
          {daftar.length === 0 ? <p className="kosong">Belum ada program.</p> : daftar.map((p) => (
            ubah?.id === p.id ? (
              <form key={p.id} className="panel form" onSubmit={simpanUbah}>
                <Isian v={ubah} set={setUbah} />
                <div className="form-aksi"><button className="btn" disabled={sibuk}>Simpan</button><button type="button" className="btn garis" onClick={() => setUbah(null)}>Batal</button></div>
              </form>
            ) : (
              <KartuProgram
                key={p.id} p={p} h={p.h} href={`/program/${p.id}`}
                aksi={
                  <>
                    {p.status === 'aktif' && <Link className="btn kecil" href={`/bendahara/catat?program=${p.id}`}>+ Catat</Link>}
                    <button type="button" className="btn kecil garis" onClick={() => setUbah({ ...p, target: p.target ? String(p.target) : '' })}>Ubah</button>
                    <button type="button" className="btn kecil garis" onClick={() => ubahStatus(p)}>{p.status === 'aktif' ? 'Tandai selesai' : 'Buka lagi'}</button>
                    <button type="button" className="btn kecil bahaya" onClick={() => hapus(p)}>Hapus</button>
                  </>
                }
              />
            )
          ))}
        </div>
      </div>
    </main>
  )
}
