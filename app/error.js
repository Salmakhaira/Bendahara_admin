'use client'

export default function Error({ reset }) {
  return (
    <main>
      <h1>Kas Keluarga</h1>
      <div className="notif err" role="alert">
        <b>Terjadi gangguan.</b>
        <p>Halaman belum bisa ditampilkan. Silakan coba lagi.</p>
      </div>
      <button onClick={() => reset()}>Coba lagi</button>
    </main>
  )
}
