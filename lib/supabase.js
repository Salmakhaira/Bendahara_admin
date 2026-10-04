import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Salin .env.example menjadi .env.local lalu isi nilainya.'
  )
}

export const supabase = createClient(url, key, {
  // di server (halaman keluarga) tidak perlu menyimpan sesi login
  auth: { persistSession: typeof window !== 'undefined' },
})

export const buktiUrl = (p) => supabase.storage.from('bukti').getPublicUrl(p).data.publicUrl
