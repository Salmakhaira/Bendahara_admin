import { adaInfoBayar } from '../../lib/pengaturan'
import SalinTombol from './SalinTombol'

// Kartu "Cara berdonasi". `kosong` = tampilkan pesan jika bendahara belum mengisi.
export default function InfoBayar({ p, kosong = false }) {
  if (!adaInfoBayar(p)) {
    return kosong ? (
      <section className="panel info-bayar">
        <h2>Cara berdonasi</h2>
        <p className="redup">Bendahara belum mengisi informasi pembayaran.</p>
      </section>
    ) : null
  }
  return (
    <section className="panel info-bayar" aria-label="Cara berdonasi">
      <h2>Cara berdonasi</h2>
      <p className="redup">Sukarela, sebesar yang berkenan.</p>
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
      {p.info && <p className="teks-bebas">{p.info}</p>}
    </section>
  )
}
