import './globals.css'
import { Atkinson_Hyperlegible } from 'next/font/google'

// Font yang dirancang khusus agar mudah dibaca, termasuk oleh mata yang sudah lemah
const font = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', fallback: ['system-ui', 'Arial', 'sans-serif'] })

export const metadata = {
  title: 'Kas Keluarga',
  description: 'Catatan uang kas keluarga besar',
  // data keluarga: jangan dimunculkan di Google
  robots: { index: false, follow: false },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Kas Keluarga', statusBarStyle: 'default' },
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' }

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>{children}</body>
    </html>
  )
}
