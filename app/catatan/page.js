import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { rp, bulanLabel } from '../../lib/format'
import { bacaFilter, terapkanFilter, urutan, qs } from '../../lib/query'
import Kepala from '../components/Kepala'
import { ambilProgram, petaNama } from '../../lib/program'
import Kartu from '../components/Kartu'

export const dynamic = 'force-dynamic'

const PER_HALAMAN = 30

export default async function Catatan({ searchParams }) {
  const filter = bacaFilter(searchParams)
  const batas = Math.min(Math.max(parseInt(searchParams?.batas) || PER_HALAMAN, PER_HALAMAN), 1000)

  const [ringkas, bulanan, daftar, prog] = await Promise.all([
    supabase.from('ringkasan').select('*').single(),
    supabase.from('ringkasan_bulanan').select('*').order('bulan', { ascending: true }),
    terapkanFilter(
      urutan(supabase.from('transaksi').select('*', { count: 'exact' })), filter
    ).limit(batas),
    ambilProgram(),
  ])
  const namaProgram = petaNama(prog.data ?? [])

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

  const tabUrl = (tipe) => '/catatan' + qs({ ...filter, tipe })

  return (
    <>
      <Kepala />
      <main className="wrap sempit">
        <h1>Catatan kas</h1>

        <dl className="tiga" aria-label="Ringkasan kas">
          <div><dt>Uang kas sekarang</dt><dd>{rp(r.saldo)}</dd></div>
          <div className="m"><dt>Total masuk</dt><dd>{rp(r.total_masuk)}</dd></div>
          <div className="k"><dt>Total keluar</dt><dd>{rp(r.total_keluar)}</dd></div>
        </dl>

        <nav className="tab-jenis" aria-label="Pilih jenis catatan">
          <Link href={tabUrl('')} className={!filter.tipe ? 'on' : ''} aria-current={!filter.tipe ? 'page' : undefined}>Semua</Link>
          <Link href={tabUrl('masuk')} className={'masuk' + (filter.tipe === 'masuk' ? ' on' : '')} aria-current={filter.tipe === 'masuk' ? 'page' : undefined}>Uang masuk</Link>
          <Link href={tabUrl('keluar')} className={'keluar' + (filter.tipe === 'keluar' ? ' on' : '')} aria-current={filter.tipe === 'keluar' ? 'page' : undefined}>Uang keluar</Link>
        </nav>

        <details className="panel pilih-lanjut" open={!!(filter.bulan || filter.q)}>
          <summary>Pilih bulan atau cari nama</summary>
          <form method="get" action="/catatan" className="filter">
            <input type="hidden" name="tipe" value={filter.tipe} />
            <label className="f">Bulan
              <select name="bulan" defaultValue={filter.bulan}>
                <option value="">Semua bulan</option>
                {[...bulanList].reverse().map((b) => (
                  <option key={b.bulan} value={b.bulan.slice(0, 7)}>{bulanLabel(b.bulan)}</option>
                ))}
              </select>
            </label>
            <label className="f cari">Cari nama atau keperluan
              <input name="q" defaultValue={filter.q} maxLength={60} placeholder="Contoh: Wening" />
            </label>
            <div className="filter-aksi">
              <button className="btn">Tampilkan</button>
              {adaFilter && <Link className="btn garis" href="/catatan">Hapus pilihan</Link>}
            </div>
          </form>
        </details>

        {bln && (
          <section className="bulan" aria-label={'Ringkasan ' + bulanLabel(filter.bulan)}>
            <h2>{bulanLabel(filter.bulan)}</h2>
            <dl>
              <div><dt>Saldo awal</dt><dd>{rp(bln.awal)}</dd></div>
              <div className="m"><dt>Uang masuk</dt><dd>+ {rp(bln.masuk)}</dd></div>
              <div className="k"><dt>Uang keluar</dt><dd>− {rp(bln.keluar)}</dd></div>
              <div className="akhir"><dt>Saldo akhir</dt><dd>{rp(bln.akhir)}</dd></div>
            </dl>
            <Link className="btn kecil garis jarak" href={`/laporan/${filter.bulan}`}>Buka laporan {bulanLabel(filter.bulan)}</Link>
          </section>
        )}

        <h2 className="sub">{adaFilter ? 'Hasil' : 'Semua catatan'}</h2>
        <p className="hitung" aria-live="polite">Menampilkan {baris.length} dari {total} catatan</p>

        {baris.length > 0 ? (
          <div className="buku">{baris.map((t) => <Kartu key={t.id} t={t} program={namaProgram[t.program_id]} />)}</div>
        ) : (
          <p className="kosong">{adaFilter ? 'Tidak ada catatan yang cocok. Coba ganti bulan atau kata kunci.' : 'Belum ada catatan.'}</p>
        )}
        {lebih && <Link className="btn garis blok besar" href={urlLebih} scroll={false}>Tampilkan lebih banyak</Link>}

        <p className="jarak"><Link href="/laporan">Laporan per bulan (untuk dicetak)</Link></p>
      </main>
    </>
  )
}
