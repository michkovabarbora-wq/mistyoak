import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ZakazkaDetailContent } from './ZakazkaDetailContent'
import type { Zakazka, Material, Dokument, Ukol, KomunikaceZaznam, Kalkulace } from '@/types'

interface Props {
  params: { id: string }
}

export default async function ZakazkaDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: zakazka } = await supabase
    .from('zakazky')
    .select('*, zakaznik:zakaznici(jmeno, telefon, email, adresa)')
    .eq('id', params.id)
    .single()
  if (!zakazka) notFound()
  const [{ data: materialy },{ data: dokumenty },{ data: ukoly },{ data: komunikace },{ data: kalkulace }] = await Promise.all([
    supabase.from('materialy').select('*').eq('zakazka_id', params.id),
    supabase.from('dokumenty').select('*').eq('zakazka_id', params.id),
    supabase.from('ukoly').select('*').eq('zakazka_id', params.id),
    supabase.from('komunikace_zaznamy').select('*').eq('zakazka_id', params.id).limit(20),
    supabase.from('kalkulace').select('*').eq('zakazka_id', params.id).single(),
  ])
  return <ZakazkaDetailContent zakazka={zakazka as Zakazka & { zakaznik: any }} materialy={(materialy as Material[]) ?? []} dokumenty={(dokumenty as Dokument[]) ?? []} ukoly={(ukoly as Ukol[]) ?? []} komunikace={(komunikace as KomunikaceZaznam[]) ?? []} kalkulace={(kalkulace as Kalkulace) ?? null} />
}
