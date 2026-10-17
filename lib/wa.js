import { rp, bulanLabel } from './format'

// {URL} diganti alamat situs saat tombol ditekan (lihat BagikanWa).
export const linkWa = (teks) => 'https://wa.me/?text=' + encodeURIComponent(teks)

export const pesanRingkasan = ({ namaKas = 'Kas Keluarga', saldo, bulan, iuran }) => {
  const baris = [`*${namaKas}*`, `Saldo kas saat ini: *${rp(saldo)}*`]
  if (iuran && iuran.jumlah > 0) {
    baris.push(`Iuran ${bulanLabel(bulan)}: ${iuran.lunas} dari ${iuran.jumlah} anggota sudah lunas.`)
  }
  baris.push('', 'Rincian lengkap bisa dilihat di sini:', '{URL}')
  return baris.join('\n')
}

export const pesanTransaksi = ({ namaKas = 'Kas Keluarga', t, saldo }) => {
  const masuk = t.tipe === 'masuk'
  const pihak = masuk ? `dari ${t.dari || 'kas'}` : `untuk ${t.ke || 'kas'}`
  return [
    `*${namaKas}*`,
    `${masuk ? 'Uang masuk' : 'Uang keluar'} *${rp(t.jumlah)}* ${pihak}.`,
    `Keperluan: ${t.alasan}`,
    `Saldo kas sekarang: *${rp(saldo)}*`,
    '',
    'Catatan lengkap:',
    '{URL}',
  ].join('\n')
}

export const pesanPengingat = ({ namaKas = 'Kas Keluarga', bulan, belum, info }) => {
  const baris = [`*Pengingat iuran ${bulanLabel(bulan)}* — ${namaKas}`, '']
  if (!belum.length) {
    baris.push('Alhamdulillah, semua iuran bulan ini sudah lunas. Terima kasih! 🙏')
  } else {
    baris.push('Yang belum membayar:')
    belum.forEach((b, i) =>
      baris.push(`${i + 1}. ${b.nama} — ${rp(b.kurang)}${b.status === 'sebagian' ? ' (kurang)' : ''}`)
    )
    if (info) baris.push('', info)
    baris.push('', 'Terima kasih 🙏', 'Status iuran: {URL}/iuran')
  }
  return baris.join('\n')
}
