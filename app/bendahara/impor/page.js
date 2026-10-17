'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { ambilAnggota, ambilProgram } from '../../../lib/program'
import { parseCsv, siapkanBaris, CONTOH_CSV } from '../../../lib/csv'
import { rp, tgl } from '../../../lib/format'

const kunci = (t) => [t.tanggal, t.tipe, Number(t.jumlah), (t.alasan ?? '').trim().toLowerCase()].join('|')

export default function Impor() {
  const [hasil, setHasil] = useState(null)
  const [dobel, setDobel] = useState(new Set())
  const [lewati, setLewati] = useState(true)
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)

  async function pilih(e) {
    const file = e.target.files?.[0]
    setPesan(null); setHasil(null)
    if (!file) return
    const teks = await file.text()
    const [{ data: ang }, { data: prog }] = await Promise.all([ambilAnggota(), ambilProgram()])
    const h = siapkanBaris(parseCsv(teks), ang ?? [], prog ?? [])
    setHasil(h)
    if (h.baris.length) {
      const { data } = await supabase.from('transaksi').select('tanggal,tipe,jumlah,alasan').limit(5000)
      setDobel(new Set((data ?? []).map(kunci)))
    }
  }

  const baris = hasil?.baris ?? []
  const valid = baris.filter((b) => !b.galat)
  const kembar = valid.filter((b) => dobel.has(kunci(b)))
  const masuk = lewati ? valid.filter((b) => !dobel.has(kunci(b))) : valid

  async function impor() {
    if (!masuk.length || sibuk) return
    if (!window.confirm(`Impor ${masuk.length} catatan?`)) return
    setSibuk(true); setPesan(null)
    let ok = 0
    for (let i = 0; i < masuk.length; i += 100) {
      const potong = masuk.slice(i, i + 100).map((b) => ({
        tanggal: b.tanggal, tipe: b.tipe, jumlah: b.jumlah, dari: b.dari || null, ke: b.ke || null,
        alasan: b.alasan, kategori: b.kategori || null, anggota_id: b.anggota_id || null, program_id: b.program_id || null,
      }))
      const { error } = await supabase.from('transaksi').insert(potong)
      if (error) { setSibuk(false); return setPesan({ jenis: 'err', teks: `Berhenti setelah ${ok} catatan masuk: ${error.message}` }) }
      ok += potong.length
    }
    setSibuk(false); setHasil(null)
    setPesan({ jenis: 'ok', teks: `${ok} catatan berhasil diimpor.` })
  }

  const unduhContoh = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + CONTOH_CSV], { type: 'text/csv' }))
    a.download = 'contoh-impor.csv'; a.click()
  }

  return (
    <main className="wrap sempit">
      <div className="alat"><h1>Impor catatan lama</h1><Link className="btn kecil garis" href="/bendahara/kelola">‹ Kelola</Link></div>
      <section className="panel form">
        <p>Pilih file CSV (dari Excel: Simpan sebagai CSV). Kolom wajib: tanggal, jumlah, keperluan. Kolom lain: jenis, dari, untuk, kategori, program (nama program yang sudah dibuat).</p>
        <div className="form-aksi"><button type="button" className="btn kecil garis" onClick={unduhContoh}>Unduh contoh file</button></div>
        <label className="f">File CSV<input type="file" accept=".csv,text/csv,text/plain" onChange={pilih} /></label>
      </section>
      {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      {hasil?.galatUmum && <div className="notif err" role="alert">{hasil.galatUmum}</div>}
      {baris.length > 0 && (
        <section className="panel">
          <h2>Pratinjau</h2>
          <p><b>{valid.length}</b> baris benar{baris.length - valid.length > 0 && <>, <b>{baris.length - valid.length}</b> bermasalah (dilewati)</>}{kembar.length > 0 && <>, <b>{kembar.length}</b> tampak sudah ada</>}.</p>
          {kembar.length > 0 && <label className="centang"><input type="checkbox" checked={lewati} onChange={(e) => setLewati(e.target.checked)} /> Lewati yang tampak sudah ada</label>}
          <div className="gulir-x">
            <table className="tabel">
              <thead><tr><th>#</th><th>Tanggal</th><th>Jenis</th><th className="r">Jumlah</th><th>Keperluan</th><th>Status</th></tr></thead>
              <tbody>
                {baris.slice(0, 50).map((b) => (
                  <tr key={b.no}>
                    <td>{b.no}</td><td className="nowrap">{b.tanggal ? tgl(b.tanggal) : '-'}</td><td>{b.tipe ?? '-'}</td>
                    <td className="r nowrap">{b.jumlah ? rp(b.jumlah) : '-'}</td><td>{b.alasan}</td>
                    <td>{b.galat ? <span className="k">{b.galat}</span> : dobel.has(kunci(b)) ? 'Sudah ada?' : 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {baris.length > 50 && <p className="hitung">Menampilkan 50 dari {baris.length} baris.</p>}
          <button type="button" className="btn blok besar jarak" disabled={!masuk.length || sibuk} onClick={impor}>{sibuk ? 'Mengimpor...' : `Impor ${masuk.length} catatan`}</button>
        </section>
      )}
    </main>
  )
}
