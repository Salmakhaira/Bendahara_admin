import Link from 'next/link'

// Bilah atas: nama aplikasi di kiri, menu di kanan.
// Tanpa `children` menampilkan menu untuk keluarga.
export default function Kepala({ children }) {
  return (
    <header className="bar">
      <div className="bar-in">
        <Link href="/" className="merek">
          <span className="logo" aria-hidden="true">Rp</span>
          <span>Kas Keluarga</span>
        </Link>
        <nav className="bar-nav" aria-label="Menu utama">
          {children ?? (
            <>
              <Link href="/riwayat">Riwayat</Link>
              <Link href="/bendahara" className="btn kecil terang">Bendahara</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
