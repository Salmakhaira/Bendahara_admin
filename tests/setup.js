// Nilai palsu agar lib/supabase.js bisa dimuat saat tes (tes tidak menghubungi Supabase).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'tes'
