'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { rp, tgl, KATEGORI, hariIni } from '../../lib/format'
import { kecilkan } from '../../lib/gambar'
import Kepala from '../components/Kepala'
import Kartu from '../components/Kartu'

const KOSONG = () => ({ tipe: 'masuk', tanggal: hariIni(), jumlah: '', kategori: '', dari: '', ke: '', alasan: '' })
const digit = (s) => s.replace(/\D/g, '').slice(0, 13)
const titik = (s) => (s ? Number(s).toLocaleString('id-ID') : '')
const PER = 20

export default function Dashboard({ email }) {
  const [form, setForm] = useState(KOSONG)
  const [edit, setEdit] = useState(null) // baris yang sedang diubah
  const [hapusBukti, setHapusBukti] = useState(false)
  const [pesan, setPesan] = useState(null) // { jenis: 'ok' | 'err' | 'info', teks }
  const [sibuk, setSibuk] = useState(false)
  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [batas, setBatas] = useState(PER)
  const [ringkas, setRingkas] = useState(null)
  const [kunciFile, setKunciFile] = useState(0)
  const fileRef = useRef(null)
  const formRef = useRef(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const masuk = form.tipe === 'masuk'

  const muat = useCallback(async () => {
    const [r, l] = await Promise.all([
      supabase.from('ringkasan').select('*').single(),
      supabase.from('transaksi').select('*', { count: 'exact' })
        .order('tanggal', { ascending: false }).order('dibuat_pada', { ascending: false }).limit(batas),
    ])
    if (r.error || l.error) return setPesan({ jenis: 'err', teks: 'Daftar catatan gagal dimuat. Coba muat ulang halaman.' })
    setRingkas(r.data)
    setDaftar(l.data)
    setTotal(l.count ?? l.data.length)
  }, [batas])

  useEffect(() => { muat() }, [muat])

  function batal() {
    setEdit(null); setForm(KOSONG()); setHapusBukti(false); setKunciFile((k) => k + 1)
  }

  function mulaiUbah(t) {
    setEdit(t)
    setHapusBukti(false)
    setKunciFile((k) => k + 1)
    setPesan(null)
    setForm({
      tipe: t.tipe, tanggal: t.tanggal, jumlah: String(t.jumlah), kategori: t.kategori ?? '',
      dari: t.dari ?? '', ke: t.ke ?? '', alasan: t.alasan,
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return

    const jumlah = Number(form.jumlah)
    const dari = form.dari.trim(), ke = form.ke.trim(), alasan = form.alasan.trim()
    const galat =
      !(jumlah > 0 && Number.isSafeInteger(jumlah)) ? 'Jumlah harus lebih dari 0.'
      : !form.tanggal ? 'Tanggal belum diisi.'
      : masuk && !dari ? 'Isi "Dari siapa" uang ini diterima.'
      : !masuk && !ke ? 'Isi "Untuk siapa" uang ini dibayarkan.'
      : !alasan ? 'Keperluan belum diisi.'
      : null
    if (galat) return setPesan({ jenis: 'err', teks: galat })

    setSibuk(true)
    setPesan({ jenis: 'info', teks: 'Menyimpan...' })
    let baru = null
    try {
      const asli = fileRef.current?.files?.[0]
      if (asli) {
        const file = await kecilkan(asli)
        const ext = file.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase()
        baru = `${form.tanggal.slice(0, 4)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from('bukti').upload(baru, file, { contentType: file.type })
        if (error) { baru = null; throw new Error('Bukti gagal diunggah: ' + error.message) }
      }

      const lama = edit?.bukti_path ?? null
      const bukti_path = baru ?? (hapusBukti ? null : lama)
      const isi = {
        tipe: form.tipe, tanggal: form.tanggal, jumlah, kategori: form.kategori || null,
        dari: dari || null, ke: ke || null, alasan, bukti_path,
      }

      const q = edit
        ? supabase.from('transaksi').update(isi).eq('id', edit.id)
        : supabase.from('transaksi').insert(isi)
      const { data, error } = await q.select()
      if (error || !data?.length) {
        if (baru) await supabase.storage.from('bukti').remove([baru]) // jangan tinggalkan file yatim
        throw new Error(error ? 'Catatan gagal disimpan: ' + error.message : 'Catatan tidak tersimpan (akun tidak punya izin).')
      }
      if (lama && lama !== bukti_path) await supabase.storage.from('bukti').remove([lama])

      setPesan({ jenis: 'ok', teks: edit ? 'Perubahan tersimpan.' : 'Tersimpan. Catatan sudah tampil di halaman utama.' })
      batal()
      await muat()
    } catch (err) {
      setPesan({ jenis: 'err', teks: err.message })
    } finally {
      setSibuk(false)
    }
  }

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
      if (edit?.id === t.id) batal()
      setPesan({ jenis: 'ok', teks: 'Catatan dihapus.' })
      await muat()
    }
    setSibuk(false)
  }

  return (
    <>
      <Kepala>
        <Link href="/">Beranda</Link>
        <Link href="/riwayat">Riwayat</Link>
        <button className="btn kecil terang" onClick={() => supabase.auth.signOut()}>Keluar</button>
      </Kepala>

      <main className="wrap">
        <h1 className="sr">Halaman bendahara</h1>
        <div className="tata admin">
          <aside className="samping">
            {ringkas && (
              <section className="saldo kecil" aria-label="Saldo kas">
                <p>Uang kas sekarang</p>
                <strong>{rp(ringkas.saldo)}</strong>
                <p className="akun">Masuk sebagai {email}</p>
              </section>
            )}

            <form className="panel form" onSubmit={simpan} noValidate>
              <h2 ref={formRef}>{edit ? 'Ubah catatan' : 'Catat transaksi'}</h2>
              {edit && (
                <div className="notif info">
                  Sedang mengubah catatan tanggal {tgl(edit.tanggal)}. Perubahan akan tercatat di riwayat.
                </div>
              )}

              <fieldset className="segmen">
                <legend>Jenis</legend>
                <label className={masuk ? 'pilih masuk' : 'pilih'}>
                  <input type="radio" name="tipe" value="masuk" checked={masuk} onChange={set('tipe')} />
                  ↑ Uang masuk
                </label>
                <label className={!masuk ? 'pilih keluar' : 'pilih'}>
                  <input type="radio" name="tipe" value="keluar" checked={!masuk} onChange={set('tipe')} />
                  ↓ Uang keluar
                </label>
              </fieldset>

              <div className="grid2">
                <label className="f">Tanggal
                  <input type="date" required value={form.tanggal} onChange={set('tanggal')} />
                </label>
                <label className="f">Jumlah (Rp)
                  <input
                    inputMode="numeric" autoComplete="off" placeholder="0" required
                    value={titik(form.jumlah)}
                    onChange={(e) => setForm((f) => ({ ...f, jumlah: digit(e.target.value) }))}
                  />
                </label>
              </div>

              <label className="f">Kategori <small>(boleh dikosongkan)</small>
                <select value={form.kategori} onChange={set('kategori')}>
                  <option value="">Pilih kategori</option>
                  {KATEGORI.map((k) => <option key={k}>{k}</option>)}
                  {form.kategori && !KATEGORI.includes(form.kategori) && <option>{form.kategori}</option>}
                </select>
              </label>

              <div className="grid2">
                <label className="f">Dari siapa {masuk ? <b className="wajib">wajib</b> : <small>(kosong = kas)</small>}
                  <input value={form.dari} onChange={set('dari')} autoComplete="off" />
                </label>
                <label className="f">Untuk siapa {!masuk ? <b className="wajib">wajib</b> : <small>(kosong = kas)</small>}
                  <input value={form.ke} onChange={set('ke')} autoComplete="off" />
                </label>
              </div>

              <label className="f">Keperluan <b className="wajib">wajib</b>
                <input value={form.alasan} onChange={set('alasan')} autoComplete="off" />
              </label>

              <label className="f">{edit?.bukti_path ? 'Ganti foto bukti' : 'Foto bukti transfer'} <small>(boleh dikosongkan)</small>
                <input key={kunciFile} ref={fileRef} type="file" accept="image/*" />
              </label>
              {edit?.bukti_path && (
                <label className="centang">
                  <input type="checkbox" checked={hapusBukti} onChange={(e) => setHapusBukti(e.target.checked)} />
                  Hapus foto bukti yang sekarang
                </label>
              )}

              <div className="form-aksi">
                <button className="btn" disabled={sibuk}>{sibuk ? 'Menyimpan...' : edit ? 'Simpan perubahan' : 'Simpan catatan'}</button>
                {edit && <button type="button" className="btn garis" onClick={batal} disabled={sibuk}>Batal mengubah</button>}
              </div>
              {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
            </form>
          </aside>

          <div className="utama">
            <div className="alat">
              <h2>Semua catatan</h2>
            </div>
            <p className="hitung">Menampilkan {daftar.length} dari {total} catatan</p>

            {daftar.length > 0 ? (
              <div className="buku">
                {daftar.map((t) => (
                  <Kartu
                    key={t.id}
                    t={t}
                    aksi={
                      <>
                        <button type="button" className="btn kecil garis" onClick={() => mulaiUbah(t)} disabled={sibuk}>Ubah</button>
                        <button type="button" className="btn kecil bahaya" onClick={() => hapus(t)} disabled={sibuk}>Hapus</button>
                      </>
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="kosong">Belum ada catatan. Isi formulir untuk mencatat transaksi pertama.</p>
            )}
            {daftar.length < total && (
              <button type="button" className="btn garis blok" onClick={() => setBatas((b) => b + PER)}>Tampilkan lebih banyak</button>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
