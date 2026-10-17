'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const IKON = {
  beranda: <path d="M3 11l9-8 9 8M5.5 9.5V20h4.5v-6h4v6h4.5V9.5" />,
  iuran: (<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.3a3 3 0 010 5.7M18.3 14.4c1.7.8 2.7 2.5 2.7 5.1" /></>),
  catatan: (<><path d="M5 4h14v16H5z" /><path d="M8.5 9h7M8.5 13h7M8.5 17h4" /></>),
  laporan: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.6v.4" /></>),
  ringkasan: (<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  catat: <path d="M12 5v14M5 12h14" />,
  kelola: (<><path d="M4 7h9M18 7h2M4 17h2M11 17h9" /><circle cx="15.5" cy="7" r="2.3" /><circle cx="8.5" cy="17" r="2.3" /></>),
}

// [alamat, label, ikon, alamat lain yang ikut menandai menu ini]
const MENU = {
  keluarga: [
    ['/', 'Beranda', 'beranda'],
    ['/iuran', 'Iuran', 'iuran'],
    ['/catatan', 'Catatan', 'catatan'],
    ['/laporan', 'Laporan', 'laporan', ['/riwayat']],
    ['/info', 'Info', 'info'],
  ],
  admin: [
    ['/bendahara', 'Ringkasan', 'ringkasan'],
    ['/bendahara/iuran', 'Iuran', 'iuran'],
    ['/bendahara/catat', 'Catat', 'catat'],
    ['/bendahara/catatan', 'Catatan', 'catatan'],
    ['/bendahara/kelola', 'Kelola', 'kelola', ['/bendahara/anggota', '/bendahara/pengaturan', '/bendahara/impor']],
  ],
}

const aktif = (path, [href, , , lain = []]) => {
  if (href === '/' || href === '/bendahara') return path === href
  return [href, ...lain].some((h) => path === h || path.startsWith(h + '/'))
}

const Ikon = ({ nama }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {IKON[nama]}
  </svg>
)

// Menu di bilah atas (laptop)
export function MenuAtas({ mode }) {
  const path = usePathname() ?? ''
  return (
    <nav className="menu-atas" aria-label="Menu utama">
      {MENU[mode].map((m) => (
        <Link key={m[0]} href={m[0]} className={aktif(path, m) ? 'on' : ''} aria-current={aktif(path, m) ? 'page' : undefined}>
          {m[1]}
        </Link>
      ))}
    </nav>
  )
}

// Menu di bagian bawah layar (HP): ikon besar + tulisan
export function MenuBawah({ mode }) {
  const path = usePathname() ?? ''
  return (
    <nav className={'menu-bawah ' + mode} aria-label="Menu utama">
      {MENU[mode].map((m) => (
        <Link
          key={m[0]}
          href={m[0]}
          className={(aktif(path, m) ? 'on ' : '') + (m[2] === 'catat' ? 'utama' : '')}
          aria-current={aktif(path, m) ? 'page' : undefined}
        >
          <span className="ik"><Ikon nama={m[2]} /></span>
          <span className="tx-menu">{m[1]}</span>
        </Link>
      ))}
    </nav>
  )
}
