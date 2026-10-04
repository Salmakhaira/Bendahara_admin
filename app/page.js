import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { rp, bulanLabel } from '../lib/format'
import { bacaFilter, terapkanFilter, urutan, qs } from '../lib/query'
import Kartu from './components/Kartu'
import CetakTombol from './components/CetakTombol'

export const dynamic = 'force-dynamic'

const PER_HALAMAN = 30

export default async function Home({ searchParams }) {
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
      <main>
        <h1>Kas Keluarga</h1>
        <div className="notif err" role="alert">
          <b>Data belum bisa dimuat.</b>
          <p>Coba muat ulang halaman beberapa saat lagi. Jika terus terjadi, hubungi bendahara.</p>
        </div>
      </main>
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
  const urlLebih = qs({ ...filter, batas: batas + PER_HALAMAN })

  return (
    <main>
      <h1>Kas Keluarga</h1>

      <section className="saldo" aria-label="Saldo kas saat ini">
        <p>Uang kas sekarang</p>
        <strong>{rp(r?.saldo)}</strong>
        <div className="dua">
          <span>Total masuk<br />{rp(r?.total_masuk)}</span>
          <span>Total keluar<br />{rp(r?.total_keluar)}</span>
        </div>
      </section>

      <form className="filter" method="get" action="/">
        <h2>Cari catatan</h2>
        <label>Bulan
          <select name="bulan" defaultValue={filter.bulan}>
            <option value="">Semua bulan</option>
            {[...bulanList].reverse().map((b) => (
              <option key={b.bulan} value={b.bulan.slice(0, 7)}>{bulanLabel(b.bulan)}</option>
            ))}
          </select>
        </label>
        <label>Jenis
          <select name="tipe" defaultValue={filter.tipe}>
            <option value="">Masuk dan keluar</option>
            <option value="masuk">Hanya uang masuk</option>
            <option value="keluar">Hanya uang keluar</option>
          </select>
        </label>
        <label>Kata kunci <small>(nama orang, keperluan, kategori)</small>
          <input name="q" defaultValue={filter.q} maxLength={60} />
        </label>
        <button>Tampilkan</button>
        {adaFilter && <Link className="tombol abu" href="/">Hapus pilihan</Link>}
      </form>

      {bln && (
        <section className="bulan" aria-label={'Ringkasan ' + bulanLabel(filter.bulan)}>
          <h2>{bulanLabel(filter.bulan)}</h2>
          <dl>
            <div><dt>Saldo awal bulan</dt><dd>{rp(bln.awal)}</dd></div>
            <div className="m"><dt>Uang masuk</dt><dd>+ {rp(bln.masuk)}</dd></div>
            <div className="k"><dt>Uang keluar</dt><dd>− {rp(bln.keluar)}</dd></div>
            <div className="akhir"><dt>Saldo akhir bulan</dt><dd>{rp(bln.akhir)}</dd></div>
          </dl>
        </section>
      )}

      <h2>{adaFilter ? 'Hasil pencarian' : 'Catatan terbaru'}</h2>
      <p className="hitung" aria-live="polite">
        Menampilkan {baris.length} dari {total} catatan
      </p>

      {baris.map((t) => <Kartu key={t.id} t={t} />)}
      {!baris.length && (
        <p className="kosong">{adaFilter ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan.'}</p>
      )}
      {lebih && <Link className="tombol abu" href={urlLebih} scroll={false}>Tampilkan lebih banyak</Link>}

      <nav className="kaki" aria-label="Menu lain">
        <a href={'/export' + qs(filter)}>Unduh untuk Excel (CSV)</a>
        <CetakTombol />
        <Link href="/riwayat">Riwayat perubahan catatan</Link>
        <Link href="/bendahara" className="redup">Masuk bendahara</Link>
      </nav>
    </main>
  )
}
