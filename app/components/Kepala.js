import Link from 'next/link'
import { MenuAtas, MenuBawah } from './Menu'

// Bilah atas + menu bawah (HP).
// mode: 'keluarga' | 'admin' | false (tanpa menu, untuk halaman login)
// children: isi sisi kanan bilah atas.
export default function Kepala({ mode = 'keluarga', children }) {
  return (
    <>
      <header className="bar">
        <div className="bar-in">
          <Link href={mode === 'admin' ? '/bendahara' : '/'} className="merek">
            <span className="logo" aria-hidden="true">Rp</span>
            <span>Kas Keluarga</span>
            {mode === 'admin' && <span className="tag-admin">Bendahara</span>}
          </Link>
          {mode && <MenuAtas mode={mode} />}
          <div className="bar-kanan">
            {children ?? <Link href="/bendahara" className="btn kecil terang">Bendahara</Link>}
          </div>
        </div>
      </header>
      {mode && <MenuBawah mode={mode} />}
    </>
  )
}
