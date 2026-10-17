import { supabase } from './supabase'

export const ambilPengaturan = () => supabase.from('pengaturan').select('*').eq('id', 1).maybeSingle()

export const adaInfoBayar = (p) => !!(p && (p.no_rekening || p.bank || p.info))
