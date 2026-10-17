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

## Fitur (v5)

**Keluarga** (menu bawah di HP, menu atas di laptop): Beranda (saldo, iuran bulan ini, cara bayar), Iuran (lunas / belum per anggota per bulan, riwayat setahun), Catatan (semua catatan + cari), Laporan (per bulan, bisa dicetak / simpan PDF), Info (rekening, pengurus, cara pasang di layar utama HP).

**Bendahara** (`/bendahara`): Ringkasan (daftar yang perlu ditagih + pengingat WhatsApp), Iuran, Catat (pilih anggota, bulan iuran, nominal terisi otomatis), Catatan (ubah / hapus), Kelola (Anggota, Pengaturan, Impor CSV, Riwayat, Unduh cadangan).

**Bagikan ke WhatsApp**: ringkasan saldo, catatan baru, dan pengingat iuran.

**Aplikasi di layar utama (PWA)**: buka situs di HP lalu "Tambahkan ke layar utama".

### Yang perlu dilakukan setelah update
1. Jalankan ulang `schema.sql` di Supabase SQL Editor (aman diulang; menambah tabel `anggota`, `pengaturan`, kolom `anggota_id` dan `periode`).
2. Buka **Kelola > Anggota** dan tambahkan anggota + nominal iuran, lalu **Kelola > Pengaturan** untuk rekening.
3. Catatan lama bisa dimasukkan lewat **Kelola > Impor catatan lama** (CSV).

### Catatan privasi
Nama anggota dan nominal iuran bisa dibaca siapa pun yang memegang tautan situs (sama seperti catatan kas). Jangan isi data sensitif di kolom catatan.

Asumsi: iuran ditetapkan per anggota (0 = tidak wajib) dan hanya ada satu kas.

## Keamanan

- Hak ubah dijaga di **database** (Row Level Security + tabel `admins`), bukan hanya disembunyikan di tampilan.
  Anon key yang terlihat di browser hanya bisa *membaca*.
- Data tampil untuk siapa pun yang memegang tautannya (tanpa login) dan tidak diindeks Google.
  Bagikan tautan hanya di grup keluarga.
- Foto bukti: hanya gambar, maks 5 MB, otomatis dikecilkan di HP sebelum diunggah.
