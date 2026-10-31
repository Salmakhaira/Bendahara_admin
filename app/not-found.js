import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="wrap sempit">
      <h1>Halaman tidak ditemukan</h1>
      <p className="pengantar">Alamat yang kamu buka tidak ada, atau datanya sudah dihapus.</p>
      <Link className="btn" href="/">Kembali ke beranda</Link>
    </main>
  )
}
