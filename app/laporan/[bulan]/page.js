import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { rp, tgl, bulanLabel, geserBulan, adalahBulan, waktu } from '../../../lib/format'
import { ambilProgram, petaNama } from '../../../lib/program'
import { ambilPengaturan } from '../../../lib/pengaturan'
import { pesanRingkasan } from '../../../lib/wa'
import Kepala from '../../components/Kepala'
import CetakTombol from '../../components/CetakTombol'
import BagikanWa from '../../components/BagikanWa'

export const dynamic = 'force-dynamic'
export const generateMetadata = ({ params }) => ({ title: `Laporan ${adalahBulan(params.bulan) ? bulanLabel(params.bulan) : ''} — Kas Keluarga` })

export default async function LaporanBulan({ params }) {
  const bulan = params.bulan
  if (!adalahBulan(bulan)) notFound()
  const berikut = geserBulan(bulan, 1) + '-01'

  const [semua, trx, prog, pgn] = await Promise.all([
    supabase.from('ringkasan_bulanan').select('*').order('bulan', { ascending: true }),
    supabase.from('transaksi').select('*').gte('tanggal', bulan + '-01').lt('tanggal', berikut)
      .order('tanggal', { ascending: true }).order('dibuat_pada', { ascending: true }).limit(1000),
    ambilProgram(),
    ambilPengaturan(),
  ])
  if (semua.error || trx.error) notFound()

  const kunci = bulan + '-01'
  const awal = semua.data.filter((b) => String(b.bulan) < kunci).reduce((s, b) => s + b.masuk - b.keluar, 0)
  const baris = trx.data
  const masuk = baris.filter((t) => t.tipe === 'masuk').reduce((s, t) => s + t.jumlah, 0)
  const keluar = baris.filter((t) => t.tipe === 'keluar').reduce((s, t) => s + t.jumlah, 0)
  const akhir = awal + masuk - keluar
  const p = pgn.error ? null : pgn.data
  const namaProgram = petaNama(prog.data ?? [])
  // ringkasan per program pada bulan ini
  const perProgram = Object.values(baris.reduce((a, t) => {
    if (!t.program_id) return a
    const d = a[t.program_id] ?? { id: t.program_id, nama: namaProgram[t.program_id] ?? 'Program', masuk: 0, keluar: 0 }
    d[t.tipe] += t.jumlah
    a[t.program_id] = d
    return a
  }, {}))
  const sebelum = geserBulan(bulan, -1)
  const sesudah = geserBulan(bulan, 1)
  const ada = (b) => semua.data.some((x) => String(x.bulan).startsWith(b))

  return (
    <>
      <Kepala />
      <main className="wrap laporan-wrap">
        <div className="tanpa-cetak laporan-alat">
          <Link href="/laporan">‹ Semua laporan</Link>
          <div className="alat-btn">
            {ada(sebelum) && <Link className="btn kecil garis" href={`/laporan/${sebelum}`}>‹ {bulanLabel(sebelum)}</Link>}
            {ada(sesudah) && <Link className="btn kecil garis" href={`/laporan/${sesudah}`}>{bulanLabel(sesudah)} ›</Link>}
          </div>
        </div>

        <article className="kertas-laporan">
          <header>
            <p className="redup">{p?.nama_kas ?? 'Kas Keluarga'}</p>
            <h1>Laporan Kas {bulanLabel(bulan)}</h1>
          </header>

          <table className="tabel ringkas-tabel">
            <tbody>
              <tr><th scope="row">Saldo awal bulan</th><td>{rp(awal)}</td></tr>
              <tr><th scope="row">Total uang masuk</th><td className="m">+ {rp(masuk)}</td></tr>
              <tr><th scope="row">Total uang keluar</th><td className="k">− {rp(keluar)}</td></tr>
              <tr className="jumlah-akhir"><th scope="row">Saldo akhir bulan</th><td>{rp(akhir)}</td></tr>
            </tbody>
          </table>

          <h2>Rincian transaksi</h2>
          {baris.length === 0 ? (
            <p className="kosong">Tidak ada transaksi pada bulan ini.</p>
          ) : (
            <div className="gulir-x">
              <table className="tabel rincian">
                <thead>
                  <tr><th>Tanggal</th><th>Uraian</th><th className="r">Masuk</th><th className="r">Keluar</th></tr>
                </thead>
                <tbody>
                  {baris.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap">{tgl(t.tanggal)}</td>
                      <td>
                        <b>{t.alasan}</b>
                        <small>Dari {t.dari || 'Kas'} ke {t.ke || 'Kas'}{t.program_id && namaProgram[t.program_id] ? ` · ${namaProgram[t.program_id]}` : t.kategori ? ` · ${t.kategori}` : ''}</small>
                      </td>
                      <td className="r m">{t.tipe === 'masuk' ? rp(t.jumlah) : ''}</td>
                      <td className="r k">{t.tipe === 'keluar' ? rp(t.jumlah) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><th colSpan={2}>Jumlah</th><th className="r m">{rp(masuk)}</th><th className="r k">{rp(keluar)}</th></tr>
                </tfoot>
              </table>
            </div>
          )}
          {baris.length >= 1000 && <p className="hitung">Laporan hanya menampilkan 1000 transaksi pertama.</p>}

          {perProgram.length > 0 && (
            <section>
              <h2>Per program bulan ini</h2>
              <div className="gulir-x">
                <table className="tabel">
                  <thead><tr><th>Program</th><th className="r">Terkumpul</th><th className="r">Disalurkan</th></tr></thead>
                  <tbody>
                    {perProgram.map((d) => (
                      <tr key={d.id}><td>{d.nama}</td><td className="r m">{rp(d.masuk)}</td><td className="r k">{rp(d.keluar)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer className="tanda-tangan">
            <div>
              {p?.pengurus && <p className="teks-bebas redup">{p.pengurus}</p>}
              <small className="redup">Dibuat {waktu(new Date().toISOString())}</small>
            </div>
            <div className="ttd">
              <span>Bendahara,</span>
              <span className="garis-ttd" />
            </div>
          </footer>
        </article>

        <div className="tanpa-cetak laporan-aksi">
          <CetakTombol label="Cetak / simpan sebagai PDF" kelas="btn" />
          <BagikanWa
            label="Bagikan ke WhatsApp"
            teks={pesanRingkasan({ namaKas: p?.nama_kas, saldo: akhir }).replace('Saldo kas saat ini', 'Saldo akhir ' + bulanLabel(bulan))}
          />
          <a className="btn garis" href={`/export?bulan=${bulan}`}>Unduh CSV</a>
        </div>
      </main>
    </>
  )
}
