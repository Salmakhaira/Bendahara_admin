import { rp, tgl } from '../../lib/format'
import { buktiUrl } from '../../lib/supabase'

// Satu baris catatan (seperti baris buku kas).
// `aksi` (opsional) = tombol tambahan untuk halaman bendahara.
export default function Kartu({ t, aksi }) {
  const masuk = t.tipe === 'masuk'
  return (
    <article className={'tx ' + t.tipe}>
      <span className="ikon" aria-hidden="true">{masuk ? '↑' : '↓'}</span>

      <div className="tx-kanan">
        <div className="tx-jumlah">
          <span className="sr">{masuk ? 'Uang masuk ' : 'Uang keluar '}</span>
          {(masuk ? '+ ' : '− ') + rp(t.jumlah)}
        </div>
        <time dateTime={t.tanggal}>{tgl(t.tanggal)}</time>
      </div>

      <div className="tx-isi">
        <h3>{t.alasan}</h3>
        <p className="tx-pihak">
          Dari <b>{t.dari || 'Kas keluarga'}</b> ke <b>{t.ke || 'Kas keluarga'}</b>
        </p>
        {(t.kategori || t.bukti_path || t.diubah_pada) && (
          <div className="tx-meta">
            {t.kategori && <span className="lencana">{t.kategori}</span>}
            {t.bukti_path && (
              <a href={buktiUrl(t.bukti_path)} target="_blank" rel="noreferrer">Lihat bukti transfer</a>
            )}
            {t.diubah_pada && <small>Sudah diperbarui bendahara</small>}
          </div>
        )}
      </div>

      {aksi && <div className="tx-aksi">{aksi}</div>}
    </article>
  )
}
