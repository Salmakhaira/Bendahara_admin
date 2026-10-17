import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { rp, bulanLabel } from '../../lib/format'
import { bacaFilter, terapkanFilter, urutan, qs } from '../../lib/query'
import Kepala from '../components/Kepala'
import Kartu from '../components/Kartu'
import CetakTombol from '../components/CetakTombol'
import Saldo from '../components/Saldo'

export const dynamic = 'force-dynamic'

const PER_HALAMAN = 30

export default async function Catatan({ searchParams }) {
  const filter = bacaFilter(searchParams)
  const batas = Math.min(Math.max(parseInt(searchParams?.batas) || PER_HALAMAN, PER_HALAMAN), 1000)

  const [ringkas, bulanan, daftar] = await Promise.all([
    supabase.from('ringkasan').select('*').single(),
    supabase.from('ringkasan_bulanan').select('*').order('bulan', { ascending: true }),
    terapkanFilter(
      urutan(supabase.from('transaksi').select('*', { count: 'exact' })), filter
    ).limit(batas),
  ])

  const gagal = ringkas.error || bulanan.error || daftar.error
  if (gagal) {
    return (
      <>
        <Kepala />
        <main className="wrap sempit">
          <h1>Data belum bisa dimuat</h1>
          <div className="notif err" role="alert">
            Muat ulang halaman beberapa saat lagi. Jika terus terjadi, hubungi bendahara.
          </div>
        </main>
      </>
    )
  }

  const r = ringkas.data
  const baris = daftar.data ?? []
  const total = daftar.count ?? baris.length
  const bulanList = bulanan.data ?? []

  // ringkasan bulan terpilih: saldo awal -> masuk/keluar -> saldo akhir
  let bln = null
  if (filter.bulan) {
    const kunci = filter.bulan + '-01'
    const sebelum = bulanList.filter((b) => b.bulan < kunci).reduce((s, b) => s + b.masuk - b.keluar, 0)
    const ini = bulanList.find((b) => b.bulan === kunci) ?? { masuk: 0, keluar: 0 }
    bln = { awal: sebelum, masuk: ini.masuk, keluar: ini.keluar, akhir: sebelum + ini.masuk - ini.keluar }
  }

  const adaFilter = filter.bulan || filter.tipe || filter.q
  const lebih = baris.length < total
  const urlLebih = '/catatan' + qs({ ...filter, batas: batas + PER_HALAMAN })

  return (
    <>
      <Kepala />
      <main className="wrap">
        <h1 className="sr">Catatan kas</h1>
        <div className="tata">
          <aside className="samping">
            <Saldo r={r} />
            <p className="jaminan">
              Hanya bendahara yang bisa mengubah catatan. Setiap perubahan tercatat di{' '}
              <Link href="/riwayat">riwayat perubahan</Link>.
            </p>
          </aside>

          <div className="utama">
            <form className="panel filter" method="get" action="/catatan">
              <label className="f">Bulan
                <select name="bulan" defaultValue={filter.bulan}>
                  <option value="">Semua bulan</option>
                  {[...bulanList].reverse().map((b) => (
                    <option key={b.bulan} value={b.bulan.slice(0, 7)}>{bulanLabel(b.bulan)}</option>
                  ))}
                </select>
              </label>
              <label className="f">Jenis
                <select name="tipe" defaultValue={filter.tipe}>
                  <option value="">Semua</option>
                  <option value="masuk">Masuk</option>
                  <option value="keluar">Keluar</option>
                </select>
              </label>
              <label className="f cari">Cari
                <input name="q" defaultValue={filter.q} maxLength={60} placeholder="Nama, keperluan, atau kategori" />
              </label>
              <div className="filter-aksi">
                <button className="btn">Tampilkan</button>
                {adaFilter && <Link className="btn garis" href="/catatan">Hapus pilihan</Link>}
              </div>
            </form>

            {bln && (
              <section className="bulan" aria-label={'Ringkasan ' + bulanLabel(filter.bulan)}>
                <h2>{bulanLabel(filter.bulan)}</h2>
                <dl>
                  <div><dt>Saldo awal</dt><dd>{rp(bln.awal)}</dd></div>
                  <div className="m"><dt>Uang masuk</dt><dd>+ {rp(bln.masuk)}</dd></div>
                  <div className="k"><dt>Uang keluar</dt><dd>− {rp(bln.keluar)}</dd></div>
                  <div className="akhir"><dt>Saldo akhir</dt><dd>{rp(bln.akhir)}</dd></div>
                </dl>
              </section>
            )}

            <div className="alat">
              <h2>{adaFilter ? 'Hasil pencarian' : 'Catatan terbaru'}</h2>
              <div className="alat-btn">
                <a className="btn kecil garis" href={'/export' + qs(filter)}>Unduh CSV</a>
                <CetakTombol />
              </div>
            </div>
            <p className="hitung" aria-live="polite">Menampilkan {baris.length} dari {total} catatan</p>

            {baris.length > 0 ? (
              <div className="buku">{baris.map((t) => <Kartu key={t.id} t={t} />)}</div>
            ) : (
              <p className="kosong">{adaFilter ? 'Tidak ada catatan yang cocok. Coba ganti bulan atau kata kunci.' : 'Belum ada catatan.'}</p>
            )}
            {lebih && <Link className="btn garis blok" href={urlLebih} scroll={false}>Tampilkan lebih banyak</Link>}
          </div>
        </div>
      </main>
    </>
  )
}
