import Link from 'next/link'
import { rp } from '../../lib/format'

// Kartu ringkas satu program: terkumpul, target (jika ada), disalurkan.
export default function KartuProgram({ p, h, href = '/program/' + p.id, aksi }) {
  return (
    <article className="program-kartu">
      <div className="alat">
        <h3><Link href={href}>{p.nama}</Link></h3>
        {p.status === 'selesai' && <span className="chip lunas">Selesai</span>}
      </div>
      {p.deskripsi && <p className="redup program-ket">{p.deskripsi}</p>}
      {h.persen !== null && (
        <div className="batang iuran" role="img" aria-label={`Terkumpul ${h.persen} persen dari target`}>
          <span className="sisa" style={{ width: h.persen + '%' }} />
        </div>
      )}
      <dl className="angka-program">
        <div><dt>Terkumpul</dt><dd className="m">{rp(h.terkumpul)}</dd></div>
        {h.target && <div><dt>Target</dt><dd>{rp(h.target)}</dd></div>}
        <div><dt>Disalurkan</dt><dd className="k">{rp(h.disalurkan)}</dd></div>
      </dl>
      {aksi && <div className="aksi-baris">{aksi}</div>}
    </article>
  )
}
