'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { ambilAnggota } from '../../../lib/program'

export default function AnggotaAdmin() {
  const [daftar, setDaftar] = useState([])
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)
  const [nama, setNama] = useState('')
  const [massal, setMassal] = useState('')
  const [ubah, setUbah] = useState(null)

  const info = (jenis, teks) => setPesan({ jenis, teks })
  const muat = useCallback(async () => {
    const { data, error } = await ambilAnggota()
    if (error) return info('err', 'Gagal memuat daftar nama: ' + error.message)
    setDaftar(data)
  }, [])
  useEffect(() => { muat() }, [muat])

  async function tambah(e) {
    e.preventDefault()
    const n = nama.trim()
    if (!n) return info('err', 'Nama belum diisi.')
    if (daftar.some((a) => a.nama.toLowerCase() === n.toLowerCase())) return info('err', 'Nama itu sudah ada.')
    setSibuk(true)
    const { error } = await supabase.from('anggota').insert({ nama: n })
    setSibuk(false)
    if (error) return info('err', 'Gagal menambah: ' + error.message)
    setNama(''); info('ok', `${n} ditambahkan.`); muat()
  }

  async function tambahMassal(e) {
    e.preventDefault()
    const ada = new Set(daftar.map((a) => a.nama.toLowerCase()))
    const baris = []
    for (const l of massal.split('\n')) {
      const n = l.trim()
      if (!n || ada.has(n.toLowerCase())) continue
      ada.add(n.toLowerCase())
      baris.push({ nama: n })
    }
    if (!baris.length) return info('err', 'Tidak ada nama baru untuk ditambahkan.')
    setSibuk(true)
    const { error } = await supabase.from('anggota').insert(baris)
    setSibuk(false)
    if (error) return info('err', 'Gagal menambah: ' + error.message)
    setMassal(''); info('ok', `${baris.length} nama ditambahkan.`); muat()
  }

  async function simpanUbah(e) {
    e.preventDefault()
    const n = ubah.nama.trim()
    if (!n) return info('err', 'Nama tidak boleh kosong.')
    setSibuk(true)
    const { error } = await supabase.from('anggota').update({ nama: n, aktif: ubah.aktif, catatan: ubah.catatan?.trim() || null }).eq('id', ubah.id)
    setSibuk(false)
    if (error) return info('err', error.code === '23505' ? 'Nama itu sudah dipakai.' : 'Gagal menyimpan: ' + error.message)
    setUbah(null); info('ok', 'Perubahan disimpan.'); muat()
  }

  async function hapus(a) {
    if (!window.confirm(`Hapus ${a.nama} dari daftar?\nCatatan transaksinya tetap ada.`)) return
    const { error } = await supabase.from('anggota').delete().eq('id', a.id)
    if (error) return info('err', 'Gagal menghapus: ' + error.message)
    info('ok', 'Nama dihapus.'); muat()
  }

  return (
    <main className="wrap">
      <div className="alat"><h1>Daftar nama keluarga</h1><Link className="btn kecil garis" href="/bendahara/kelola">‹ Kelola</Link></div>
      <p className="pengantar">Daftar ini hanya untuk memilih nama penyumbang dengan cepat saat mencatat. Tidak ada iuran atau tagihan.</p>
      {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      <div className="tata admin">
        <aside className="samping">
          <form className="panel form" onSubmit={tambah}>
            <h2>Tambah nama</h2>
            <label className="f">Nama<input value={nama} onChange={(e) => setNama(e.target.value)} autoComplete="off" /></label>
            <button className="btn" disabled={sibuk}>Tambah</button>
          </form>
          <form className="panel form" onSubmit={tambahMassal}>
            <h2>Tambah banyak sekaligus</h2>
            <label className="f">Satu nama per baris
              <textarea rows={5} value={massal} onChange={(e) => setMassal(e.target.value)} /></label>
            <button className="btn" disabled={sibuk}>Tambah semua</button>
          </form>
        </aside>
        <div className="utama">
          {daftar.length === 0 ? <p className="kosong">Belum ada nama.</p> : (
            <div className="buku">
              {daftar.map((a) => ubah?.id === a.id ? (
                <form key={a.id} className="panel form" onSubmit={simpanUbah}>
                  <label className="f">Nama<input value={ubah.nama} onChange={(e) => setUbah({ ...ubah, nama: e.target.value })} /></label>
                  <label className="f">Catatan <small>boleh kosong</small><input value={ubah.catatan ?? ''} onChange={(e) => setUbah({ ...ubah, catatan: e.target.value })} /></label>
                  <label className="centang"><input type="checkbox" checked={ubah.aktif} onChange={(e) => setUbah({ ...ubah, aktif: e.target.checked })} /> Tampil di pilihan saat mencatat</label>
                  <div className="form-aksi"><button className="btn" disabled={sibuk}>Simpan</button><button type="button" className="btn garis" onClick={() => setUbah(null)}>Batal</button></div>
                </form>
              ) : (
                <div key={a.id} className="ang tetap">
                  <div className="ang-nama"><strong>{a.nama}</strong>{(a.catatan || !a.aktif) && <small>{a.catatan}{a.catatan && !a.aktif ? ' · ' : ''}{!a.aktif ? 'tidak ditampilkan' : ''}</small>}</div>
                  <div className="aksi-baris">
                    <button type="button" className="btn kecil garis" onClick={() => setUbah({ ...a })}>Ubah</button>
                    <button type="button" className="btn kecil bahaya" onClick={() => hapus(a)}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
