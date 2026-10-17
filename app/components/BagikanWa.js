'use client'
import { linkWa } from '../../lib/wa'

// Membuka WhatsApp dengan teks siap kirim. "{URL}" diganti alamat situs ini.
export default function BagikanWa({ teks, label = 'Bagikan ke WhatsApp', kelas = 'btn kecil garis' }) {
  const buka = () => {
    const isi = teks.replaceAll('{URL}', window.location.origin)
    window.open(linkWa(isi), '_blank', 'noopener')
  }
  return (
    <button type="button" className={kelas} onClick={buka}>
      {label}
    </button>
  )
}
