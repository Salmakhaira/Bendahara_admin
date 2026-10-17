'use client'

export default function CetakTombol({ label = 'Cetak', kelas = 'btn kecil garis' }) {
  return (
    <button type="button" className={kelas} onClick={() => window.print()}>
      {label}
    </button>
  )
}
