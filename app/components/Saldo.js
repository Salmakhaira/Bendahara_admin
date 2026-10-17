import { rp } from '../../lib/format'

// Kartu saldo + batang "terpakai". Dipakai di halaman keluarga dan bendahara.
export default function Saldo({ r, akun }) {
  const masuk = Number(r?.total_masuk ?? 0)
  const keluar = Number(r?.total_keluar ?? 0)
  const terpakai = masuk > 0 ? Math.min(100, Math.round((keluar / masuk) * 100)) : 0

  return (
    <section className="saldo" aria-label="Saldo kas saat ini">
      <p className="saldo-label">Uang kas sekarang</p>
      <strong className="saldo-angka">{rp(r?.saldo)}</strong>

      {masuk > 0 && (
        <div className="batang-wrap">
          <div
            className="batang"
            role="img"
            aria-label={`Sudah terpakai ${terpakai} persen dari total uang masuk`}
          >
            <span className="sisa" style={{ width: 100 - terpakai + '%' }} />
            <span className="pakai" style={{ width: terpakai + '%' }} />
          </div>
          <p className="batang-ket">Terpakai {terpakai}% dari total uang masuk</p>
        </div>
      )}

      <dl className="dua">
        <div className="m"><dt>Total masuk</dt><dd>{rp(r?.total_masuk)}</dd></div>
        <div className="k"><dt>Total keluar</dt><dd>{rp(r?.total_keluar)}</dd></div>
      </dl>
      {akun && <p className="akun">{akun}</p>}
    </section>
  )
}
