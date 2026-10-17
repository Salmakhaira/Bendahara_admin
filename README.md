# Kas Keluarga

Aplikasi catatan kas keluarga besar. **Keluarga** hanya bisa melihat saldo dan catatan;
**bendahara (admin)** satu-satunya yang bisa menambah, mengubah, dan menghapus.

| Halaman | Untuk | Isi |
|---|---|---|
| `/` | Keluarga | Saldo, filter bulan/jenis/kata kunci, ringkasan per bulan, catatan + bukti, unduh CSV, cetak |
| `/riwayat` | Keluarga | Log otomatis setiap tambah/ubah/hapus (tidak bisa dihapus) |
| `/bendahara` | Admin | Login, catat, ubah, hapus catatan, unggah bukti |

## Pasang dari awal

1. **Supabase**: buat proyek. Di *Authentication > Users > Add user*, buat akun email + kata sandi Anda,
   lalu matikan *Allow new users to sign up*.
2. Buka `schema.sql`, **ganti email di baris paling bawah** dengan email akun tadi, lalu jalankan seluruh isinya
   di *SQL Editor*.
3. Salin `.env.example` menjadi `.env.local`, isi URL dan anon key (*Project Settings > API*).
4. `npm install && npm run dev`
5. Deploy: push ke GitHub, import di Vercel, isi 2 environment variable yang sama.

## Sudah punya versi lama?

Data lama aman. Cukup jalankan `schema.sql` yang baru (sudah idempoten, boleh diulang), dengan email Anda di baris
paling bawah. Skema ini menambah: kolom `kategori`, tabel `admins`, riwayat perubahan, ringkasan bulanan, dan
kebijakan penyimpanan foto yang lebih ketat. Setelah itu Anda **tidak perlu lagi** mengubah data lewat Table Editor.

## Fitur (v6)

Kas ini **sukarela**: tidak ada iuran wajib atau tagihan. Uang masuk adalah sumbangan, uang keluar adalah penyaluran untuk hal-hal yang bermanfaat.

**Program** = tujuan sumbangan (misalnya "Santunan sakit", "Renovasi musala"). Target dana boleh kosong. Setiap transaksi boleh ditandai program, sehingga terlihat berapa yang terkumpul, berapa yang disalurkan, dan sisanya.

**Keluarga** (menu bawah di HP, menu atas di laptop): Beranda (saldo, program berjalan, cara berdonasi), Program (daftar dan detail program, ucapan terima kasih kepada penyumbang), Catatan, Laporan (per bulan, bisa dicetak / simpan PDF, ada ringkasan per program), Info (rekening, pengurus, cara pasang di layar utama HP).

**Bendahara** (`/bendahara`): Ringkasan, Program (buat, ubah, tandai selesai), Catat (pilih nama dari daftar, pilih program), Catatan (ubah / hapus), Kelola (Daftar nama, Pengaturan, Impor CSV, Riwayat, Unduh cadangan).

**WhatsApp**: bagikan ringkasan saldo, catatan baru, dan ajakan berdonasi per program (tanpa menyebut nama siapa pun).

**PWA**: buka situs di HP lalu "Tambahkan ke layar utama".

### Setelah update
1. Jalankan ulang `schema.sql` di Supabase SQL Editor (aman diulang; menambah tabel `program` dan kolom `program_id`). Kolom iuran dari versi sebelumnya dibiarkan, tidak dipakai.
2. **Kelola > Program**: buat program pertama. **Kelola > Pengaturan**: isi rekening.
3. Catatan lama bisa diimpor lewat **Kelola > Impor** (CSV, kolom `program` memakai nama program yang sudah dibuat).

### Catatan privasi
Nama penyumbang dan jumlahnya bisa dibaca siapa pun yang memegang tautan situs (sama seperti catatan kas). Jangan isi data sensitif di kolom catatan.

## Keamanan

- Hak ubah dijaga di **database** (Row Level Security + tabel `admins`), bukan hanya disembunyikan di tampilan.
  Anon key yang terlihat di browser hanya bisa *membaca*.
- Data tampil untuk siapa pun yang memegang tautannya (tanpa login) dan tidak diindeks Google.
  Bagikan tautan hanya di grup keluarga.
- Foto bukti: hanya gambar, maks 5 MB, otomatis dikecilkan di HP sebelum diunggah.
