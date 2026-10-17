'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { ambilPengaturan } from '../../../lib/pengaturan'

const AWAL = { nama_kas: 'Kas Keluarga', bank: '', no_rekening: '', atas_nama: '', tanggal_jatuh_tempo: '', info: '', pengurus: '' }

export default function PengaturanAdmin() {
  const [f, setF] = useState(AWAL)
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    ambilPengaturan().then(({ data, error }) => {
      if (error) return setPesan({ jenis: 'err', teks: 'Pengaturan belum bisa dimuat. Pastikan schema.sql terbaru sudah dijalankan.' })
      if (data) setF({ ...AWAL, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])) })
    })
  }, [])

  async function simpan(e) {
    e.preventDefault()
    const tempo = f.tanggal_jatuh_tempo === '' ? null : Number(f.tanggal_jatuh_tempo)
    if (tempo !== null && !(Number.isInteger(tempo) && tempo >= 1 && tempo <= 28)) return setPesan({ jenis: 'err', teks: 'Tanggal jatuh tempo harus 1 sampai 28.' })
    setSibuk(true)
    const v = (s) => (String(s).trim() || null)
    const { error } = await supabase.from('pengaturan').upsert({
      id: 1, nama_kas: v(f.nama_kas) ?? 'Kas Keluarga', bank: v(f.bank), no_rekening: v(f.no_rekening), atas_nama: v(f.atas_nama),
      tanggal_jatuh_tempo: tempo, info: v(f.info), pengurus: v(f.pengurus),
    })
    setSibuk(false)
    setPesan(error ? { jenis: 'err', teks: 'Gagal menyimpan: ' + error.message } : { jenis: 'ok', teks: 'Pengaturan disimpan. Anggota akan melihatnya di halaman Info.' })
  }

  return (
    <main className="wrap sempit">
      <div className="alat"><h1>Pengaturan</h1><Link className="btn kecil garis" href="/bendahara/kelola">‹ Kelola</Link></div>
      <form className="panel form" onSubmit={simpan}>
        <label className="f">Nama kas<input value={f.nama_kas} onChange={set('nama_kas')} /></label>
        <div className="grid2">
          <label className="f">Bank / e-wallet<input value={f.bank} onChange={set('bank')} placeholder="BCA, DANA, ..." /></label>
          <label className="f">Nomor rekening<input inputMode="numeric" value={f.no_rekening} onChange={set('no_rekening')} /></label>
        </div>
        <label className="f">Atas nama<input value={f.atas_nama} onChange={set('atas_nama')} /></label>
        <label className="f">Jatuh tempo iuran tiap tanggal <small>1–28, boleh kosong</small>
          <input inputMode="numeric" value={f.tanggal_jatuh_tempo} onChange={set('tanggal_jatuh_tempo')} /></label>
        <label className="f">Info pembayaran tambahan<textarea rows={3} value={f.info} onChange={set('info')} placeholder="Contoh: kirim bukti transfer ke bendahara" /></label>
        <label className="f">Pengurus <small>boleh kosong</small><textarea rows={3} value={f.pengurus} onChange={set('pengurus')} placeholder="Bendahara: ..." /></label>
        <div className="form-aksi"><button className="btn" disabled={sibuk}>{sibuk ? 'Menyimpan...' : 'Simpan'}</button></div>
        {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      </form>
    </main>
  )
}
