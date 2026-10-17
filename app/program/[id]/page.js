import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { rp } from '../../../lib/format'
import { urutan } from '../../../lib/query'
import { hitungProgram, penyumbang } from '../../../lib/program'
import { ambilPengaturan, adaInfoBayar } from '../../../lib/pengaturan'
import { pesanAjakan } from '../../../lib/wa'
import Kepala from '../../components/Kepala'
import Kartu from '../../components/Kartu'
import InfoBayar from '../../components/InfoBayar'
import BagikanWa from '../../components/BagikanWa'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function DetailProgram({ params }) {
  if (!UUID.test(params.id)) notFound()
  const { data: p, error } = await supabase.from('program').select('*').eq('id', params.id).maybeSingle()
  if (error || !p) notFound()
  const [trx, pgn] = await Promise.all([
    urutan(supabase.from('transaksi').select('*').eq('program_id', p.id)).limit(200),
    ambilPengaturan(),
  ])
  const baris = trx.data ?? []
  const h = hitungProgram(p, baris)
  const donatur = penyumbang(baris.filter((t) => t.tipe === 'masuk'))
  const png = pgn.error ? null : pgn.data
  const info = adaInfoBayar(png) && png.no_rekening ? `Transfer ke ${png.bank ?? 'rekening'} ${png.no_rekening}${png.atas_nama ? ' a.n. ' + png.atas_nama : ''}` : ''

  return (
    <>
      <Kepala />
      <main className="wrap">
        <p><Link href="/program">‹ Semua program</Link></p>
        <div className="tata">
          <aside className="samping">
            <section className="panel">
              <h1>{p.nama}</h1>
              {p.status === 'selesai' && <span className="chip lunas">Program selesai</span>}
              {p.deskripsi && <p className="teks-bebas">{p.deskripsi}</p>}
              {h.persen !== null && (
                <div className="batang iuran" role="img" aria-label={`Terkumpul ${h.persen} persen dari target`}>
                  <span className="sisa" style={{ width: h.persen + '%' }} />
                </div>
              )}
              <dl className="angka-program tegak">
                <div><dt>Terkumpul</dt><dd className="m">{rp(h.terkumpul)}</dd></div>
                {h.target && <div><dt>Target</dt><dd>{rp(h.target)} ({h.persen}%)</dd></div>}
                <div><dt>Disalurkan</dt><dd className="k">{rp(h.disalurkan)}</dd></div>
                <div><dt>Sisa dana program</dt><dd>{rp(h.sisa)}</dd></div>
                <div><dt>Jumlah penyumbang</dt><dd>{h.penyumbang} orang</dd></div>
              </dl>
            </section>
            {p.status === 'aktif' && (
              <BagikanWa kelas="btn garis blok" label="Ajak berdonasi lewat WhatsApp" teks={pesanAjakan({ namaKas: png?.nama_kas, program: p, h, info })} />
            )}
          </aside>

          <div className="utama tumpuk">
            {p.status === 'aktif' && <InfoBayar p={png} />}
            {donatur.length > 0 && (
              <section className="panel" aria-label="Penyumbang">
                <h2>Terima kasih kepada</h2>
                <ul className="donatur">
                  {donatur.map((d) => <li key={d.nama}><span>{d.nama}</span><b>{rp(d.total)}</b></li>)}
                </ul>
              </section>
            )}
            <section aria-label="Catatan program">
              <h2>Catatan program</h2>
              {baris.length > 0 ? (
                <div className="buku jarak">{baris.map((t) => <Kartu key={t.id} t={t} />)}</div>
              ) : (
                <p className="kosong jarak">Belum ada catatan untuk program ini.</p>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
