'use client'

export default function CetakTombol() {
  return (
    <button type="button" className="tautan" onClick={() => window.print()}>
      Cetak halaman ini
    </button>
  )
}
