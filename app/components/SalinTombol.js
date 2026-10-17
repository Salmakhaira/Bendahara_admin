'use client'
import { useState } from 'react'

export default function SalinTombol({ teks, label = 'Salin' }) {
  const [ok, setOk] = useState(false)
  async function salin() {
    try {
      await navigator.clipboard.writeText(teks)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = teks
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
    }
    setOk(true)
    setTimeout(() => setOk(false), 2000)
  }
  return (
    <button type="button" className="btn kecil garis" onClick={salin} aria-live="polite">
      {ok ? 'Tersalin ✓' : label}
    </button>
  )
}
