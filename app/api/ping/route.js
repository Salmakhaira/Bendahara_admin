import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

// Dipanggil terjadwal oleh Vercel Cron (lihat vercel.json) agar project Supabase paket gratis
// tidak dijeda karena lama tidak ada aktivitas. Hanya membaca satu baris publik.
export async function GET() {
  const { error } = await supabase.from('pengaturan').select('id').limit(1)
  return Response.json({ ok: !error }, { status: error ? 503 : 200, headers: { 'Cache-Control': 'no-store' } })
}
