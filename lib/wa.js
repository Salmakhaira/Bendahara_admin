import { rp } from './format'

// {URL} diganti alamat situs saat tombol ditekan (lihat BagikanWa).
export const linkWa = (teks) => 'https://wa.me/?text=' + encodeURIComponent(teks)

export const pesanRingkasan = ({ namaKas = 'Kas Keluarga', saldo, program = [] }) => {
  const baris = [`*${namaKas}*`, `Saldo kas saat ini: *${rp(saldo)}*`]
  if (program.length) {
    baris.push('', 'Program yang sedang berjalan:')
    program.slice(0, 5).forEach((p) =>
      baris.push(`• ${p.nama}: terkumpul ${rp(p.h.terkumpul)}${p.h.target ? ` dari ${rp(p.h.target)}` : ''}`)
    )
  }
  baris.push('', 'Rincian lengkap bisa dilihat di sini:', '{URL}')
  return baris.join('\n')
}

export const pesanTransaksi = ({ namaKas = 'Kas Keluarga', t, saldo, program }) => {
  const masuk = t.tipe === 'masuk'
  const pihak = masuk ? `dari ${t.dari || 'kas'}` : `untuk ${t.ke || 'kas'}`
  return [
    `*${namaKas}*`,
    masuk ? `Terima kasih, sumbangan *${rp(t.jumlah)}* ${pihak} sudah dicatat. 🙏` : `Uang keluar *${rp(t.jumlah)}* ${pihak}.`,
    `Keperluan: ${t.alasan}`,
    ...(program ? [`Program: ${program}`] : []),
    `Saldo kas sekarang: *${rp(saldo)}*`,
    '',
    'Catatan lengkap:',
    '{URL}',
  ].join('\n')
}

// Ajakan berdonasi untuk satu program. Sukarela, tanpa menyebut nama siapa pun.
export const pesanAjakan = ({ namaKas = 'Kas Keluarga', program, h, info }) => {
  const baris = [`*${program.nama}* — ${namaKas}`]
  if (program.deskripsi) baris.push(program.deskripsi)
  baris.push('', `Terkumpul: *${rp(h.terkumpul)}*${h.target ? ` dari target ${rp(h.target)} (${h.persen}%)` : ''}`)
  baris.push('', 'Bagi yang berkenan dan berkelapangan, silakan ikut berdonasi (sukarela).')
  if (info) baris.push(info)
  baris.push('', 'Jazakumullahu khairan 🙏', 'Rincian: {URL}/program/' + program.id)
  return baris.join('\n')
}
