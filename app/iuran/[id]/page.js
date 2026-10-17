import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { bulanIni, bulanLabel, tgl, rp } from '../../../lib/format'
import { ambilSetoran, statusTahun, NAMA_STATUS } from '../../../lib/iuran'
import Kepala from '../../components/Kepala'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NAMA_BULAN = (b) => bulanLabel(b).split(' ')[0]

export default async function IuranAnggota({ params, searchParams }) {
  if (!UUID.test(params.id)) notFound()
  const sekarang = bulanIni()
  const tahunIni = Number(sekarang.slice(0, 4))
  const t = parseInt(searchParams?.tahun)
  const tahun = t >= 2000 && t <= 2100 ? t : tahunIni

  const { data: a, error } = await supabase.from('anggota').select('*').eq('id', params.id).maybeSingle()
  if (error || !a) notFound()
  const { data: setoran } = await ambilSetoran(`${tahun}-01`, `${tahun}-12`, a.id)

  const bulan = statusTahun(a, setoran ?? [], tahun, sekarang)
  const tertagih = bulan.filter((b) => ['lunas', 'sebagian', 'belum'].includes(b.status))
  const lunas = bulan.filter((b) => b.status === 'lunas').length
  const menunggak = bulan.filter((b) => b.status === 'belum' || b.status === 'sebagian')
  const kurang = menunggak.reduce((s, b) => s + Math.max(0, a.iuran_bulanan - b.dibayar), 0)
  const total = (setoran ?? []).reduce((s, x) => s + Number(x.jumlah), 0)

  return (
    <>
      <Kepala />
      <main className="wrap sempit">
        <p><Link href="/iuran">‹ Kembali ke daftar iuran</Link></p>
        <h1>{a.nama}</h1>
        <p className="redup">
          {a.iuran_bulanan > 0 ? <>Iuran {rp(a.iuran_bulanan)} per bulan, mulai {bulanLabel(String(a.mulai_iuran).slice(0, 7))}.</> : 'Tidak ada iuran wajib.'}
          {!a.aktif && ' (anggota tidak aktif)'}
        </p>

        <nav className="bulan-nav" aria-label="Pilih tahun">
          <Link className="btn kecil garis" href={`/iuran/${a.id}?tahun=${tahun - 1}`}>‹ {tahun - 1}</Link>
          <strong>{tahun}</strong>
          {tahun < tahunIni ? <Link className="btn kecil garis" href={`/iuran/${a.id}?tahun=${tahun + 1}`}>{tahun + 1} ›</Link> : <span />}
        </nav>

        <div className="ringkas-orang">
          <div><small>Lunas</small><b>{lunas} bulan</b></div>
          <div><small>Belum lunas</small><b className={menunggak.length ? 'k' : ''}>{menunggak.length} bulan</b></div>
          <div><small>Kekurangan</small><b className={kurang ? 'k' : ''}>{rp(kurang)}</b></div>
          <div><small>Total setoran {tahun}</small><b>{rp(total)}</b></div>
        </div>

        <div className="tile-bulan">
          {bulan.map((b) => (
            <div key={b.bulan} className={'tile ' + b.status}>
              <span className="nm">{NAMA_BULAN(b.bulan)}</span>
              <span className="st">
                {b.status === 'na' ? '—' : b.status === 'akan' ? 'Belum waktunya' : NAMA_STATUS[b.status]}
              </span>
              {b.dibayar > 0 && <span className="rp">{rp(b.dibayar)}</span>}
            </div>
          ))}
        </div>
        {tertagih.length === 0 && <p className="kosong">Belum ada bulan yang ditagih pada tahun {tahun}.</p>}

        <h2 className="sub">Riwayat setoran {tahun}</h2>
        {(setoran ?? []).length > 0 ? (
          <div className="buku">
            {setoran.map((s) => (
              <div key={s.id} className="baris-setor">
                <div>
                  <strong>Iuran {bulanLabel(s.periode)}</strong>
                  <small>Dibayar {tgl(s.tanggal)}</small>
                </div>
                <b className="m">{rp(s.jumlah)}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="kosong">Belum ada setoran pada tahun {tahun}.</p>
        )}
      </main>
    </>
  )
}
