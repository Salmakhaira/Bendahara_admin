'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { ambilAnggota, ambilProgram } from '../../../lib/program'
import { parseCsv, excelKeTabel, cariTabel, siapkanBaris, CONTOH_CSV } from '../../../lib/csv'
import { rp, tgl } from '../../../lib/format'

const kunci = (t) => [t.tanggal, t.tipe, Number(t.jumlah), (t.alasan ?? '').trim().toLowerCase()].join('|')

export default function Impor() {
  const [mentah, setMentah] = useState(null) // { tabel, mulai, namaSheet, ang, prog }
  const [tebak, setTebak] = useState(true)
  const [dobel, setDobel] = useState(new Set())
  const [lewati, setLewati] = useState(true)
  const [pesan, setPesan] = useState(null)
  const [sibuk, setSibuk] = useState(false)

  async function pilih(e) {
    const file = e.target.files?.[0]
    setPesan(null); setMentah(null)
    if (!file) return
    let tabel, mulai = 0, namaSheet = null
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { default: bacaExcel } = await import('read-excel-file')
        // pakai sheet pertama yang punya kolom Tanggal, Uang Masuk/Keluar dan Keterangan
        const daftarSheet = await bacaExcel(file, { getSheets: true })
        for (const sh of daftarSheet) {
          const ketemu = cariTabel(excelKeTabel(await bacaExcel(file, { sheet: sh.name })))
          if (ketemu) { tabel = ketemu.tabel; mulai = ketemu.mulai; namaSheet = sh.name; break }
        }
        if (!tabel) return setPesan({ jenis: 'err', teks: 'Tidak ada sheet dengan kolom Tanggal, Uang Masuk / Uang Keluar, dan Keterangan. Gunakan template dari tombol unduh.' })
      } else if (/\.xls$/i.test(file.name)) {
        return setPesan({ jenis: 'err', teks: 'Format .xls lama belum didukung. Simpan ulang sebagai .xlsx lalu unggah lagi.' })
      } else {
        tabel = parseCsv(await file.text())
      }
    } catch {
      return setPesan({ jenis: 'err', teks: 'File tidak bisa dibaca. Pastikan file .xlsx atau .csv yang utuh dan tidak dikunci password.' })
    }
    const [{ data: ang }, { data: prog }] = await Promise.all([ambilAnggota(), ambilProgram()])
    setMentah({ tabel, mulai, namaSheet, ang: ang ?? [], prog: prog ?? [] })
    if (tabel.length > 1) {
      const { data } = await supabase.from('transaksi').select('tanggal,tipe,jumlah,alasan').limit(5000)
      setDobel(new Set((data ?? []).map(kunci)))
    }
  }

  const hasil = useMemo(
    () => (mentah ? { ...siapkanBaris(mentah.tabel, mentah.ang, mentah.prog, mentah.mulai, { tebak }), namaSheet: mentah.namaSheet } : null),
    [mentah, tebak]
  )
  const baris = hasil?.baris ?? []
  const valid = baris.filter((b) => b.galat.length === 0)
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
    setSibuk(false); setMentah(null)
    setPesan({ jenis: 'ok', teks: `${ok} catatan berhasil diimpor.` })
  }

  const unduhContoh = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + CONTOH_CSV], { type: 'text/csv' }))
    a.download = 'contoh-impor.csv'; a.click()
  }

  return (
    <main className="wrap">
      <div className="alat"><h1>Impor catatan lama</h1><Link className="btn kecil garis" href="/bendahara/kelola">‹ Kelola</Link></div>
      <section className="panel form">
        <p>Unggah catatan lama dalam file Excel (.xlsx). Pakai template supaya kolomnya sesuai.</p>
        <div className="form-aksi">
          <a className="btn" href="/template-impor-kas.xlsx" download>Unduh template Excel</a>
          <button type="button" className="btn kecil garis" onClick={unduhContoh}>Atau contoh format CSV</button>
        </div>
        <label className="f">Pilih file (.xlsx atau .csv)<input type="file" accept=".xlsx,.csv,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pilih} /></label>
      </section>
      <section className="panel">
        <h2>Kolom di template masuk ke mana</h2>
        <div className="gulir-x">
          <table className="tabel">
            <thead><tr><th>Kolom</th><th>Masuk ke</th></tr></thead>
            <tbody>
              <tr><td>Tanggal</td><td>Tanggal transaksi</td></tr>
              <tr><td>Bulan</td><td>Tidak disimpan (dihitung dari tanggal)</td></tr>
              <tr><td>Uang Masuk</td><td>Jumlah, jenis <b className="m">uang masuk</b></td></tr>
              <tr><td>Uang Keluar</td><td>Jumlah, jenis <b className="k">uang keluar</b></td></tr>
              <tr><td>Total</td><td>Tidak disimpan, hanya untuk memeriksa saldo</td></tr>
              <tr><td>Keterangan</td><td>Keperluan</td></tr>
              <tr><td>Dari, Untuk, Kategori, Program</td><td>Opsional, kolom yang sama di aplikasi</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
      {hasil?.peringatan?.length > 0 && (
        <div className="notif info" role="status">
          <b>Total di file tidak cocok dengan hitungan aplikasi.</b> Periksa dulu sebelum impor:
          <ul>{hasil.peringatan.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {hasil?.namaSheet && <div className="notif info" role="status">Membaca sheet: <b>{hasil.namaSheet}</b></div>}
      {hasil?.catatan?.length > 0 && (
        <div className="notif info" role="status"><ul>{hasil.catatan.map((t) => <li key={t}>{t}</li>)}</ul></div>
      )}
      {hasil?.galatUmum && <div className="notif err" role="alert">{hasil.galatUmum}</div>}
      {baris.length > 0 && (
        <section className="panel">
          <h2>Pratinjau</h2>
          <label className="centang">
            <input type="checkbox" checked={tebak} onChange={(e) => setTebak(e.target.checked)} />
            Isi Dari, Untuk dan Kategori otomatis dari keterangan
          </label>
          <p><b>{valid.length}</b> baris benar{baris.length - valid.length > 0 && <>, <b>{baris.length - valid.length}</b> bermasalah (dilewati)</>}{kembar.length > 0 && <>, <b>{kembar.length}</b> tampak sudah ada</>}.</p>
          {kembar.length > 0 && <label className="centang"><input type="checkbox" checked={lewati} onChange={(e) => setLewati(e.target.checked)} /> Lewati yang tampak sudah ada</label>}
          <div className="gulir-x">
            <table className="tabel">
              <thead><tr><th>#</th><th>Tanggal</th><th>Jenis</th><th className="r">Jumlah</th><th>Dari</th><th>Untuk</th><th>Kategori</th><th>Keperluan</th><th>Status</th></tr></thead>
              <tbody>
                {baris.slice(0, 50).map((b) => (
                  <tr key={b.no}>
                    <td>{b.no}</td><td className="nowrap">{b.tanggal ? tgl(b.tanggal) : '-'}</td><td>{b.tipe ?? '-'}</td>
                    <td className="r nowrap">{b.jumlah ? rp(b.jumlah) : '-'}</td><td>{b.dari ?? ''}</td><td>{b.ke ?? ''}</td><td>{b.kategori ?? ''}</td><td>{b.alasan}</td>
                    <td>{b.galat.length ? <span className="k">{b.galat.join(', ')}</span> : dobel.has(kunci(b)) ? 'Sudah ada?' : 'OK'}</td>
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
