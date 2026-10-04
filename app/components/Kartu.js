import { rp, tgl } from '../../lib/format'
import { buktiUrl } from '../../lib/supabase'

// Kartu satu catatan. `aksi` (opsional) = tombol tambahan untuk halaman bendahara.
export default function Kartu({ t, aksi }) {
  const masuk = t.tipe === 'masuk'
  return (
    <article className={'kartu ' + t.tipe}>
      <div className="baris">
        <b>{masuk ? '↑ Uang masuk' : '↓ Uang keluar'}</b>
        <span>{tgl(t.tanggal)}</span>
      </div>
      <div className="jumlah">{(masuk ? '+ ' : '− ') + rp(t.jumlah)}</div>
      {t.kategori && <span className="lencana">{t.kategori}</span>}
      <p><span className="label">Dari:</span> {t.dari || 'Kas keluarga'}</p>
      <p><span className="label">Untuk:</span> {t.ke || 'Kas keluarga'}</p>
      <p><span className="label">Keperluan:</span> {t.alasan}</p>
      {t.bukti_path && (
        <p>
          <a href={buktiUrl(t.bukti_path)} target="_blank" rel="noreferrer">Lihat bukti transfer</a>
        </p>
      )}
      {t.diubah_pada && <small className="diubah">Catatan ini pernah diperbarui bendahara</small>}
      {aksi}
    </article>
  )
}
