import Link from 'next/link'
import { rp, bulanLabel } from '../../lib/format'

// Ringkasan iuran satu bulan: berapa yang sudah lunas + batang kemajuan.
export default function KartuIuran({ bulan, st, href = '/iuran', judul }) {
  if (!st || st.jumlah === 0) return null
  return (
    <section className="panel kartu-iuran" aria-label={'Iuran ' + bulanLabel(bulan)}>
      <div className="alat">
        <h2>{judul ?? 'Iuran ' + bulanLabel(bulan)}</h2>
        <Link className="btn kecil garis" href={href}>Lihat per anggota</Link>
      </div>
      <p className="besar"><b>{st.lunas}</b> dari {st.jumlah} anggota sudah lunas</p>
      <div className="batang iuran" role="img" aria-label={`Terkumpul ${st.persen} persen dari target`}>
        <span className="sisa" style={{ width: st.persen + '%' }} />
      </div>
      <p className="batang-ket">
        Terkumpul <b>{rp(st.terkumpul)}</b> dari target {rp(st.target)}
        {st.belum + st.sebagian > 0 && <> · {st.belum + st.sebagian} belum lunas</>}
      </p>
    </section>
  )
}
