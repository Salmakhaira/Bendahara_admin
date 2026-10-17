'use client'

export default function Error({ reset }) {
  return (
    <main className="wrap sempit">
      <h1>Halaman belum bisa ditampilkan</h1>
      <div className="notif err" role="alert">
        Terjadi gangguan saat memuat data. Silakan coba lagi.
      </div>
      <button className="btn" onClick={() => reset()}>Coba lagi</button>
    </main>
  )
}
