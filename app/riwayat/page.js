import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { rp, tgl, waktu } from '../../lib/format'
import { ambilProgram, petaNama } from '../../lib/program'
import Kepala from '../components/Kepala'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Riwayat perubahan — Kas Keluarga' }

const NAMA = { tambah: 'Ditambahkan', ubah: 'Diubah', hapus: 'Dihapus' }
const LABEL = {
  tanggal: 'Tanggal', tipe: 'Jenis', jumlah: 'Jumlah', dari: 'Dari', ke: 'Untuk',
  alasan: 'Keperluan', kategori: 'Kategori', program_id: 'Program', bukti_path: 'Bukti',
}

const tampil = (k, v, prog = {}) => {
  if (v === null || v === undefined || v === '') return '(kosong)'
  if (k === 'jumlah') return rp(v)
  if (k === 'tanggal') return tgl(v)
  if (k === 'tipe') return v === 'masuk' ? 'Uang masuk' : 'Uang keluar'
  if (k === 'program_id') return prog[v] ?? 'program dihapus'
  if (k === 'bukti_path') return 'ada foto'
  return String(v)
}

// daftar perbedaan antara data lama dan baru
const beda = (a, b) =>
  Object.keys(LABEL).filter((k) => (a?.[k] ?? null) !== (b?.[k] ?? null))

export default async function Riwayat() {
  const { data, error } = await supabase
    .from('transaksi_log').select('*').order('waktu', { ascending: false }).limit(100)

  const prog = petaNama((await ambilProgram()).data ?? [])

  return (
    <>
      <Kepala />
      <main className="wrap sempit">
        <h1>Riwayat perubahan</h1>
        <p className="pengantar">
          Setiap kali bendahara menambah, mengubah, atau menghapus catatan, kejadiannya tercatat otomatis
          di sini dan tidak bisa dihapus, sehingga semua keluarga bisa ikut memantau.
        </p>

        {error && <div className="notif err" role="alert">Riwayat belum bisa dimuat. Coba muat ulang halaman.</div>}
        {!error && !data?.length && <p className="kosong">Belum ada perubahan yang tercatat.</p>}

        <div className="buku">
          {(data ?? []).map((l) => {
            const d = l.data_baru ?? l.data_lama
            return (
              <article key={l.id} className={'log ' + l.aksi}>
                <div className="log-kepala">
                  <span className="aksi-tag">{NAMA[l.aksi]}</span>
                  <time>{waktu(l.waktu)}</time>
                </div>
                <p className="log-isi">
                  {d.tipe === 'masuk' ? 'Uang masuk' : 'Uang keluar'} <b>{rp(d.jumlah)}</b> untuk {d.alasan}
                  <span className="redup"> (tanggal {tgl(d.tanggal)})</span>
                </p>
                {l.aksi === 'ubah' && (
                  <ul>
                    {beda(l.data_lama, l.data_baru).map((k) => (
                      <li key={k}>
                        {LABEL[k]}: {tampil(k, l.data_lama[k], prog)} menjadi <b>{tampil(k, l.data_baru[k], prog)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>
        <p><Link href="/laporan">Kembali ke laporan</Link></p>
      </main>
    </>
  )
}
