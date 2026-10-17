'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { ambilAnggota } from '../../../lib/iuran'
import { bulanIni, rp } from '../../../lib/format'

const digit = (s) => String(s).replace(/\D/g, '').slice(0, 10)

export default function AnggotaAdmin() {
  const [daftar, setDaftar] = useState([])
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)
  const [baru, setBaru] = useState({ nama: '', iuran: '' })
  const [massal, setMassal] = useState({ teks: '', iuran: '', mulai: bulanIni() })
  const [ubah, setUbah] = useState(null)

  const muat = useCallback(async () => {
    const { data, error } = await ambilAnggota()
    if (error) return setPesan({ jenis: 'err', teks: 'Gagal memuat anggota: ' + error.message })
    setDaftar(data)
  }, [])
  useEffect(() => { muat() }, [muat])

  const info = (jenis, teks) => setPesan({ jenis, teks })

  async function tambah(e) {
    e.preventDefault()
    const nama = baru.nama.trim()
    if (!nama) return info('err', 'Nama belum diisi.')
    if (daftar.some((a) => a.nama.toLowerCase() === nama.toLowerCase())) return info('err', 'Nama itu sudah ada.')
    setSibuk(true)
    const { error } = await supabase.from('anggota').insert({ nama, iuran_bulanan: Number(baru.iuran || 0), mulai_iuran: bulanIni() + '-01' })
    setSibuk(false)
    if (error) return info('err', 'Gagal menambah: ' + error.message)
    setBaru({ nama: '', iuran: '' }); info('ok', `${nama} ditambahkan.`); muat()
  }

  async function tambahMassal(e) {
    e.preventDefault()
    const ada = new Set(daftar.map((a) => a.nama.toLowerCase()))
    const baris = []
    for (const l of massal.teks.split('\n')) {
      const [n, i] = l.split(';')
      const nama = (n ?? '').trim()
      if (!nama || ada.has(nama.toLowerCase())) continue
      ada.add(nama.toLowerCase())
      baris.push({ nama, iuran_bulanan: Number(digit(i ?? massal.iuran) || 0), mulai_iuran: massal.mulai + '-01' })
    }
    if (!baris.length) return info('err', 'Tidak ada nama baru untuk ditambahkan.')
    setSibuk(true)
    const { error } = await supabase.from('anggota').insert(baris)
    setSibuk(false)
    if (error) return info('err', 'Gagal menambah: ' + error.message)
    setMassal({ ...massal, teks: '' }); info('ok', `${baris.length} anggota ditambahkan.`); muat()
  }

  async function simpanUbah(e) {
    e.preventDefault()
    const nama = ubah.nama.trim()
    if (!nama) return info('err', 'Nama tidak boleh kosong.')
    setSibuk(true)
    const { error } = await supabase.from('anggota').update({
      nama, iuran_bulanan: Number(ubah.iuran_bulanan || 0), mulai_iuran: ubah.mulai + '-01',
      aktif: ubah.aktif, catatan: ubah.catatan?.trim() || null,
    }).eq('id', ubah.id)
    setSibuk(false)
    if (error) return info('err', error.code === '23505' ? 'Nama itu sudah dipakai anggota lain.' : 'Gagal menyimpan: ' + error.message)
    setUbah(null); info('ok', 'Perubahan disimpan.'); muat()
  }

  async function hapus(a) {
    if (!window.confirm(`Hapus ${a.nama}?\nCatatan pembayarannya tetap ada, hanya tidak lagi terhubung ke anggota. Untuk menghentikan iuran, cukup nonaktifkan.`)) return
    const { error } = await supabase.from('anggota').delete().eq('id', a.id)
    if (error) return info('err', 'Gagal menghapus: ' + error.message)
    info('ok', 'Anggota dihapus.'); muat()
  }

  return (
    <main className="wrap">
      <div className="alat"><h1>Anggota & iuran</h1><Link className="btn kecil garis" href="/bendahara/kelola">‹ Kelola</Link></div>
      {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      <div className="tata admin">
        <aside className="samping">
          <form className="panel form" onSubmit={tambah}>
            <h2>Tambah anggota</h2>
            <label className="f">Nama<input value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} autoComplete="off" /></label>
            <label className="f">Iuran per bulan (Rp) <small>0 = tidak wajib</small>
              <input inputMode="numeric" value={baru.iuran ? Number(baru.iuran).toLocaleString('id-ID') : ''} onChange={(e) => setBaru({ ...baru, iuran: digit(e.target.value) })} /></label>
            <button className="btn" disabled={sibuk}>Tambah</button>
          </form>
          <form className="panel form" onSubmit={tambahMassal}>
            <h2>Tambah banyak sekaligus</h2>
            <label className="f">Satu nama per baris <small>boleh “Nama;iuran”</small>
              <textarea rows={5} value={massal.teks} onChange={(e) => setMassal({ ...massal, teks: e.target.value })} /></label>
            <label className="f">Iuran bawaan (Rp)
              <input inputMode="numeric" value={massal.iuran ? Number(massal.iuran).toLocaleString('id-ID') : ''} onChange={(e) => setMassal({ ...massal, iuran: digit(e.target.value) })} /></label>
            <label className="f">Mulai iuran bulan<input type="month" value={massal.mulai} onChange={(e) => setMassal({ ...massal, mulai: e.target.value })} /></label>
            <button className="btn" disabled={sibuk}>Tambah semua</button>
          </form>
        </aside>
        <div className="utama">
          {daftar.length === 0 ? <p className="kosong">Belum ada anggota.</p> : (
            <div className="buku">
              {daftar.map((a) => ubah?.id === a.id ? (
                <form key={a.id} className="panel form" onSubmit={simpanUbah}>
                  <label className="f">Nama<input value={ubah.nama} onChange={(e) => setUbah({ ...ubah, nama: e.target.value })} /></label>
                  <div className="grid2">
                    <label className="f">Iuran (Rp)<input inputMode="numeric" value={ubah.iuran_bulanan ? Number(ubah.iuran_bulanan).toLocaleString('id-ID') : ''} onChange={(e) => setUbah({ ...ubah, iuran_bulanan: digit(e.target.value) })} /></label>
                    <label className="f">Mulai bulan<input type="month" value={ubah.mulai} onChange={(e) => setUbah({ ...ubah, mulai: e.target.value })} /></label>
                  </div>
                  <label className="f">Catatan<input value={ubah.catatan ?? ''} onChange={(e) => setUbah({ ...ubah, catatan: e.target.value })} /></label>
                  <label className="centang"><input type="checkbox" checked={ubah.aktif} onChange={(e) => setUbah({ ...ubah, aktif: e.target.checked })} /> Aktif (ikut iuran)</label>
                  <div className="form-aksi"><button className="btn" disabled={sibuk}>Simpan</button><button type="button" className="btn garis" onClick={() => setUbah(null)}>Batal</button></div>
                </form>
              ) : (
                <div key={a.id} className="ang tetap">
                  <div className="ang-nama">
                    <strong>{a.nama}</strong>
                    <small>{a.iuran_bulanan > 0 ? rp(a.iuran_bulanan) + ' / bulan' : 'Tidak wajib iuran'}{a.aktif ? '' : ' · tidak aktif'}</small>
                  </div>
                  <div className="aksi-baris">
                    <button type="button" className="btn kecil garis" onClick={() => setUbah({ ...a, mulai: String(a.mulai_iuran).slice(0, 7), iuran_bulanan: String(a.iuran_bulanan) })}>Ubah</button>
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
