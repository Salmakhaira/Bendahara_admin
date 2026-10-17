import Link from 'next/link'
import { bulanIni, bulanLabel, geserBulan, adalahBulan, rp } from '../../lib/format'
import { qs } from '../../lib/query'
import { ambilAnggota, ambilSetoran, statusBulan, NAMA_STATUS } from '../../lib/iuran'
import { ambilPengaturan } from '../../lib/pengaturan'
import Kepala from '../components/Kepala'
import InfoBayar from '../components/InfoBayar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Iuran — Kas Keluarga' }

const satu = (v) => (Array.isArray(v) ? v[0] : v) || ''

export default async function Iuran({ searchParams }) {
  const sekarang = bulanIni()
  let bulan = adalahBulan(satu(searchParams?.bulan)) ? satu(searchParams.bulan) : sekarang
  if (bulan > sekarang) bulan = sekarang
  const filterStatus = ['belum', 'sebagian', 'lunas'].includes(satu(searchParams?.status)) ? satu(searchParams.status) : ''
  const q = satu(searchParams?.q).trim().slice(0, 60)

  const [anggota, setoran, pgn] = await Promise.all([ambilAnggota(), ambilSetoran(bulan, bulan), ambilPengaturan()])

  if (anggota.error) {
    return (
      <>
        <Kepala />
        <main className="wrap sempit">
          <h1>Iuran</h1>
          <div className="notif info">Fitur iuran belum diaktifkan. Bendahara perlu menjalankan <code>schema.sql</code> terbaru di Supabase.</div>
        </main>
      </>
    )
  }

  const st = statusBulan(anggota.data, setoran.data ?? [], bulan)
  const awal = anggota.data.filter((a) => a.aktif && a.iuran_bulanan > 0).map((a) => String(a.mulai_iuran).slice(0, 7)).sort()[0] ?? sekarang
  const sebelum = bulan > awal ? geserBulan(bulan, -1) : null
  const sesudah = bulan < sekarang ? geserBulan(bulan, 1) : null

  const cocok = (b) => (!filterStatus || b.status === filterStatus) && (!q || b.nama.toLowerCase().includes(q.toLowerCase()))
  const baris = st.baris.filter(cocok).sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const url = (o) => '/iuran' + qs({ bulan, status: filterStatus, q, ...o })

  const chip = [
    ['', 'Semua', st.jumlah],
    ['belum', 'Belum bayar', st.belum],
    ['sebagian', 'Sebagian', st.sebagian],
    ['lunas', 'Lunas', st.lunas],
  ]

  return (
    <>
      <Kepala />
      <main className="wrap">
        <h1 className="sr">Iuran</h1>
        <div className="tata">
          <aside className="samping">
            <section className="panel ringkas-iuran" aria-label="Ringkasan iuran">
              <h2>Iuran {bulanLabel(bulan)}</h2>
              {st.jumlah === 0 ? (
                <p className="redup">Belum ada anggota yang ditagih iuran pada bulan ini.</p>
              ) : (
                <>
                  <p className="angka-besar"><b>{st.lunas}</b> <span>dari {st.jumlah} anggota lunas</span></p>
                  <div className="batang iuran" role="img" aria-label={`Terkumpul ${st.persen} persen`}>
                    <span className="sisa" style={{ width: st.persen + '%' }} />
                  </div>
                  <p className="batang-ket">Terkumpul <b>{rp(st.terkumpul)}</b> dari target {rp(st.target)}</p>
                </>
              )}
            </section>
            <InfoBayar p={pgn.error ? null : pgn.data} />
          </aside>

          <div className="utama">
            <nav className="bulan-nav" aria-label="Pilih bulan">
              {sebelum ? <Link className="btn kecil garis" href={url({ bulan: sebelum })}>‹ {bulanLabel(sebelum)}</Link> : <span />}
              <strong>{bulanLabel(bulan)}</strong>
              {sesudah ? <Link className="btn kecil garis" href={url({ bulan: sesudah })}>{bulanLabel(sesudah)} ›</Link> : <span />}
            </nav>

            <div className="chips" role="group" aria-label="Saring status">
              {chip.map(([k, label, n]) => (
                <Link key={k} href={url({ status: k })} className={'chip-pilih' + (filterStatus === k ? ' on' : '')} aria-current={filterStatus === k ? 'true' : undefined}>
                  {label} <span>{n}</span>
                </Link>
              ))}
            </div>

            <form className="cari-nama" method="get" action="/iuran">
              <input type="hidden" name="bulan" value={bulan} />
              {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
              <label className="sr" htmlFor="cari-nama">Cari nama</label>
              <input id="cari-nama" name="q" defaultValue={q} placeholder="Cari nama anggota" maxLength={60} />
              <button className="btn">Cari</button>
            </form>

            {baris.length > 0 ? (
              <div className="buku">
                {baris.map((b) => (
                  <Link key={b.id} href={`/iuran/${b.id}`} className="ang">
                    <div className="ang-nama">
                      <strong>{b.nama}</strong>
                      <small>Iuran {rp(b.iuran_bulanan)} per bulan</small>
                    </div>
                    <div className="ang-status">
                      <span className={'chip ' + b.status}>{NAMA_STATUS[b.status]}</span>
                      {b.status === 'sebagian' && <small>kurang {rp(b.kurang)}</small>}
                    </div>
                    <span className="panah" aria-hidden="true">›</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="kosong">
                {st.jumlah === 0 ? 'Belum ada data iuran untuk bulan ini.' : 'Tidak ada anggota yang cocok dengan pilihan ini.'}
              </p>
            )}
            <p className="hitung">Ketuk nama untuk melihat riwayat iuran sepanjang tahun.</p>
          </div>
        </div>
      </main>
    </>
  )
}
