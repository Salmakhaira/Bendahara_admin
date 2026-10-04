import './globals.css'
import { Atkinson_Hyperlegible } from 'next/font/google'

// Font yang dirancang khusus agar mudah dibaca, termasuk oleh mata yang sudah lemah
const font = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'] })

export const metadata = {
  title: 'Kas Keluarga',
  description: 'Catatan uang kas keluarga besar',
  // data keluarga: jangan dimunculkan di Google
  robots: { index: false, follow: false },
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f3d3e' }

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>{children}</body>
    </html>
  )
}
