'use client'

export default function CetakTombol() {
  return (
    <button type="button" className="btn kecil garis" onClick={() => window.print()}>
      Cetak
    </button>
  )
}
