// Gabungkan penambahan beruntun (mis. hasil impor ratusan baris) menjadi satu entri,
// supaya riwayat tetap terbaca. Entri yang digabung: >= 5 penambahan, jarak antar entri <= 5 menit.
export function kelompokkan(logs) {
  const hasil = []
  let i = 0
  while (i < logs.length) {
    if (logs[i].aksi !== 'tambah') { hasil.push({ jenis: 'satu', log: logs[i] }); i++; continue }
    let j = i
    while (j + 1 < logs.length && logs[j + 1].aksi === 'tambah' &&
           new Date(logs[j].waktu) - new Date(logs[j + 1].waktu) <= 5 * 60 * 1000) j++
    const isi = logs.slice(i, j + 1)
    if (isi.length >= 5) hasil.push({ jenis: 'banyak', logs: isi })
    else isi.forEach((log) => hasil.push({ jenis: 'satu', log }))
    i = j + 1
  }
  return hasil
}
