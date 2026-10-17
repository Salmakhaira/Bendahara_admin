'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { rp, tgl, KATEGORI, hariIni } from '../../../lib/format'
import { kecilkan } from '../../../lib/gambar'
import { ambilAnggota, ambilProgram } from '../../../lib/program'
import { ambilPengaturan } from '../../../lib/pengaturan'
import { pesanTransaksi } from '../../../lib/wa'
import Saldo from '../../components/Saldo'
import BagikanWa from '../../components/BagikanWa'

const digit = (s) => s.replace(/\D/g, '').slice(0, 13)
const titik = (s) => (s ? Number(s).toLocaleString('id-ID') : '')
const KOSONG = (programId = '') => ({
  tipe: 'masuk', tanggal: hariIni(), jumlah: '', kategori: '', anggotaId: '', programId,
  dari: '', ke: '', alasan: '',
})

export default function Halaman() {
  return (
    <Suspense fallback={<main className="wrap sempit"><p>Memuat...</p></main>}>
      <Form />
    </Suspense>
  )
}

function Form() {
  const router = useRouter()
  const sp = useSearchParams()
  const ubahId = sp.get('ubah')

  const [form, setForm] = useState(KOSONG)
  const [edit, setEdit] = useState(null)
  const [anggota, setAnggota] = useState([])
  const [siap, setSiap] = useState(false)
  const [program, setProgram] = useState([])
  const [hapusBukti, setHapusBukti] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [sukses, setSukses] = useState(null)
  const [sibuk, setSibuk] = useState(false)
  const [kunciFile, setKunciFile] = useState(0)
  const [ringkas, setRingkas] = useState(null)
  const [namaKas, setNamaKas] = useState('Kas Keluarga')
  const fileRef = useRef(null)

  const masuk = form.tipe === 'masuk'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const programDipilih = program.find((x) => x.id === form.programId)

  // ---- muat data awal ----
  useEffect(() => {
    (async () => {
      const [a, r, p, pr] = await Promise.all([
        ambilAnggota(), supabase.from('ringkasan').select('*').single(), ambilPengaturan(), ambilProgram(),
      ])
      if (!a.error) setAnggota(a.data)
      if (!pr.error) setProgram(pr.data)
      if (!r.error) setRingkas(r.data)
      if (!p.error && p.data?.nama_kas) setNamaKas(p.data.nama_kas)
      if (ubahId) {
        const { data } = await supabase.from('transaksi').select('*').eq('id', ubahId).maybeSingle()
        if (data) {
          setEdit(data)
          setForm({
            tipe: data.tipe, tanggal: data.tanggal, jumlah: String(data.jumlah), kategori: data.kategori ?? '',
            anggotaId: data.anggota_id ?? '', programId: data.program_id ?? '',
            dari: data.dari ?? '', ke: data.ke ?? '', alasan: data.alasan,
          })
        } else setPesan({ jenis: 'err', teks: 'Catatan yang akan diubah tidak ditemukan.' })
      } else if (sp.get('program') && pr.data?.some((x) => x.id === sp.get('program'))) {
        setForm(KOSONG(sp.get('program')))
      }
      setSiap(true)
    })()
  }, [ubahId])

  const pilihAnggota = (e) => {
    const a = anggota.find((x) => x.id === e.target.value)
    setForm((f) => ({ ...f, anggotaId: a ? a.id : '', dari: a ? a.nama : '' }))
  }
  const pilihJenis = (e) => {
    const tipe = e.target.value
    setInfo(null)
    setForm((f) => ({ ...f, tipe, ...(tipe === 'keluar' ? { anggotaId: '' } : {}) }))
  }

  function mulaiBaru() {
    setEdit(null); setForm(KOSONG(form.programId))
    setHapusBukti(false); setKunciFile((k) => k + 1); setSukses(null); setPesan(null)
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
      const adaAnggota = masuk && form.anggotaId
      const isi = {
        tipe: form.tipe, tanggal: form.tanggal, jumlah, kategori: form.kategori || null,
        dari: dari || null, ke: ke || null, alasan, bukti_path,
        anggota_id: adaAnggota ? form.anggotaId : null,
        program_id: form.programId || null,
      }
      const q = edit
        ? supabase.from('transaksi').update(isi).eq('id', edit.id)
        : supabase.from('transaksi').insert(isi)
      const { data, error } = await q.select()
      if (error || !data?.length) {
        if (baru) await supabase.storage.from('bukti').remove([baru])
        throw new Error(error ? 'Catatan gagal disimpan: ' + error.message : 'Catatan tidak tersimpan (akun tidak punya izin).')
      }
      if (lama && lama !== bukti_path) await supabase.storage.from('bukti').remove([lama])

      if (edit) return router.push('/bendahara/catatan')
      const { data: r } = await supabase.from('ringkasan').select('*').single()
      if (r) setRingkas(r)
      const dariProgram = !!sp.get('program')
      mulaiBaru()
      setSukses({ wa: pesanTransaksi({ namaKas, t: isi, saldo: r?.saldo ?? 0, program: program.find((x) => x.id === isi.program_id)?.nama }), dariProgram })
    } catch (err) {
      setPesan({ jenis: 'err', teks: err.message })
    } finally {
      setSibuk(false)
    }
  }

  const pilihanAnggota = anggota.filter((a) => a.aktif || a.id === form.anggotaId)

  return (
    <main className="wrap">
      <h1 className="sr">{edit ? 'Ubah catatan' : 'Catat transaksi'}</h1>
      <div className="tata admin">
        <aside className="samping">
          {ringkas && <Saldo r={ringkas} />}
          {sukses?.dariProgram && <Link className="btn garis blok" href="/bendahara/program">‹ Kembali ke program</Link>}
        </aside>

        <div className="utama">
          {sukses && (
            <div className="notif ok" role="status">
              <b>Tersimpan.</b> Catatan sudah tampil di halaman keluarga.
              <div className="alat-btn jarak">
                <BagikanWa teks={sukses.wa} label="Bagikan ke WhatsApp" />
                <Link className="btn kecil garis" href="/bendahara/catatan">Lihat catatan</Link>
              </div>
            </div>
          )}

          <form className="panel form" onSubmit={simpan} noValidate>
            <h2>{edit ? 'Ubah catatan' : 'Catat transaksi'}</h2>
            {edit && (
              <div className="notif info">
                Sedang mengubah catatan tanggal {tgl(edit.tanggal)}. Perubahan akan tercatat di riwayat.
              </div>
            )}

            <fieldset className="segmen">
              <legend>Jenis</legend>
              <label className={masuk ? 'pilih masuk' : 'pilih'}>
                <input type="radio" name="tipe" value="masuk" checked={masuk} onChange={pilihJenis} />
                ↑ Uang masuk
              </label>
              <label className={!masuk ? 'pilih keluar' : 'pilih'}>
                <input type="radio" name="tipe" value="keluar" checked={!masuk} onChange={pilihJenis} />
                ↓ Uang keluar
              </label>
            </fieldset>

            {masuk && pilihanAnggota.length > 0 && (
              <label className="f">Dari anggota
                <select value={form.anggotaId} onChange={pilihAnggota}>
                  <option value="">Bukan anggota (ketik nama sendiri)</option>
                  {pilihanAnggota.map((a) => <option key={a.id} value={a.id}>{a.nama}{a.aktif ? '' : ' (tidak aktif)'}</option>)}
                </select>
              </label>
            )}
            {masuk && !form.anggotaId && (
              <label className="f">Dari siapa <b className="wajib">wajib</b>
                <input value={form.dari} onChange={set('dari')} autoComplete="off" />
              </label>
            )}
            {!masuk && (
              <label className="f">Untuk siapa <b className="wajib">wajib</b>
                <input list="daftar-nama" value={form.ke} onChange={set('ke')} autoComplete="off" />
                <datalist id="daftar-nama">{anggota.map((a) => <option key={a.id} value={a.nama} />)}</datalist>
              </label>
            )}

            {program.length > 0 && (
              <label className="f">Untuk program <small>(boleh dikosongkan)</small>
                <select value={form.programId} onChange={set('programId')}>
                  <option value="">Tanpa program (kas umum)</option>
                  {program.filter((x) => x.status === 'aktif' || x.id === form.programId).map((x) => <option key={x.id} value={x.id}>{x.nama}{x.status === 'selesai' ? ' (selesai)' : ''}</option>)}
                </select>
              </label>
            )}

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

            <label className="f">Keperluan <b className="wajib">wajib</b>
                {programDipilih && !form.alasan && <small> contoh: Sumbangan untuk {programDipilih.nama}</small>}
              <input
                value={form.alasan} autoComplete="off"
                onChange={set('alasan')}
              />
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
              {edit && <Link className="btn garis" href="/bendahara/catatan">Batal mengubah</Link>}
            </div>
            {pesan && <div className={'notif ' + pesan.jenis} role={pesan.jenis === 'err' ? 'alert' : 'status'}>{pesan.teks}</div>}
          </form>
        </div>
      </div>
    </main>
  )
}
