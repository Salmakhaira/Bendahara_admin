// Mengecilkan foto bukti transfer dari kamera HP (bisa 5–10 MB) menjadi
// maks 1600px JPEG (~200–400 KB) sebelum diunggah. Jika gagal, pakai file asli.
export async function kecilkan(file, maks = 1600, mutu = 0.82) {
  if (!file || !file.type.startsWith('image/')) return file
  try {
    const bmp = await createImageBitmap(file)
    const skala = Math.min(1, maks / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * skala)
    canvas.height = Math.round(bmp.height * skala)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close?.()
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', mutu))
    if (!blob || (blob.size >= file.size && skala === 1)) return file
    return new File([blob], 'bukti.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
