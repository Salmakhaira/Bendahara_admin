'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import Kepala from '../components/Kepala'
import { SesiContext } from './Sesi'

// Gerbang untuk semua halaman /bendahara/*:
// login -> pastikan akun terdaftar sebagai admin -> tampilkan halaman + menu bendahara
export default function BendaharaLayout({ children }) {
  const [sesi, setSesi] = useState(undefined) // undefined = memuat, null = belum login
  const [admin, setAdmin] = useState(undefined)
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesi(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesi(s ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesi) return setAdmin(undefined)
    supabase.from('admins').select('user_id').eq('user_id', sesi.user.id).maybeSingle()
      .then(({ data }) => setAdmin(!!data))
  }, [sesi])

  async function masuk(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    setSibuk(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: f.get('email').trim(), password: f.get('password'),
    })
    setSibuk(false)
    setPesan(error ? 'Email atau kata sandi salah. Periksa lagi lalu coba masuk kembali.' : '')
  }

  if (sesi === undefined || (sesi && admin === undefined)) {
    return <><Kepala mode={false}><Link href="/">Beranda</Link></Kepala><main className="wrap sempit"><p>Memuat...</p></main></>
  }

  if (!sesi) return (
    <>
      <Kepala mode={false}><Link href="/">Kembali ke halaman keluarga</Link></Kepala>
      <main className="wrap tengah">
        <form className="panel masuk-kartu" onSubmit={masuk}>
          <h1>Masuk bendahara</h1>
          <p className="redup">Halaman ini khusus untuk mencatat dan mengelola kas.</p>
          <label className="f">Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="f">Kata sandi
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn blok" disabled={sibuk}>{sibuk ? 'Memeriksa...' : 'Masuk'}</button>
          {pesan && <div className="notif err" role="alert">{pesan}</div>}
        </form>
      </main>
    </>
  )

  if (!admin) return (
    <>
      <Kepala mode={false}><Link href="/">Halaman keluarga</Link></Kepala>
      <main className="wrap tengah">
        <div className="panel masuk-kartu">
          <h1>Akun ini bukan bendahara</h1>
          <div className="notif err" role="alert">
            Akun <b>{sesi.user.email}</b> belum terdaftar sebagai bendahara, jadi tidak bisa mengubah catatan.
            Jika ini akun Anda, jalankan bagian terakhir <code>schema.sql</code> di Supabase untuk mendaftarkannya.
          </div>
          <button className="btn garis blok" onClick={() => supabase.auth.signOut()}>Keluar akun</button>
        </div>
      </main>
    </>
  )

  return (
    <SesiContext.Provider value={{ email: sesi.user.email }}>
      <Kepala mode="admin">
        <Link href="/" className="hide-hp">Lihat sebagai keluarga</Link>
        <button className="btn kecil terang" onClick={() => supabase.auth.signOut()}>Keluar</button>
      </Kepala>
      {children}
    </SesiContext.Provider>
  )
}
