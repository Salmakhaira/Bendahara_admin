import { rp } from '../../lib/format'
import { adaInfoBayar } from '../../lib/pengaturan'
import SalinTombol from './SalinTombol'

// Kartu "Cara membayar iuran". `kosong` = tampilkan pesan jika bendahara belum mengisi.
export default function InfoBayar({ p, kosong = false }) {
  if (!adaInfoBayar(p)) {
    return kosong ? (
      <section className="panel info-bayar">
        <h2>Cara membayar iuran</h2>
        <p className="redup">Bendahara belum mengisi informasi pembayaran.</p>
      </section>
    ) : null
  }
  return (
    <section className="panel info-bayar" aria-label="Cara membayar iuran">
      <h2>Cara membayar iuran</h2>
      {p.no_rekening && (
        <div className="rekening">
          <div>
            <small>{p.bank || 'Rekening'}</small>
            <strong>{p.no_rekening}</strong>
            {p.atas_nama && <span>a.n. {p.atas_nama}</span>}
          </div>
          <SalinTombol teks={p.no_rekening} label="Salin nomor" />
        </div>
      )}
      {p.tanggal_jatuh_tempo && <p>Jatuh tempo: <b>setiap tanggal {p.tanggal_jatuh_tempo}</b></p>}
      {p.info && <p className="teks-bebas">{p.info}</p>}
    </section>
  )
}
