import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ZakazkaDetailContent } from './ZakazkaDetailContent'

export default async function ZakazkaDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: zakazka } = await supabase
    .from('zakazky')
    .select('*, zakaznik:zakaznici(*)')
    .eq('id', params.id)
    .single()

  if (!zakazka) notFound()

  const [
    { data: materialy },
    { data: dokumenty },
    { data: ukoly },
    { data: komunikace },
    { data: kalkulace },
  ] = await Promise.all([
    supabase.from('materialy').select('*').eq('zakazka_id', params.id),
    supabase.from('dokumenty').select('*').eq('zakazka_id', params.id).order('created_at', { ascending: false }),
    supabase.from('ukoly').select('*').eq('zakazka_id', params.id).order('created_at', { ascending: false }),
    supabase.from('komunikace').select('*').eq('zakazka_id', params.id).order('created_at', { ascending: false }),
    supabase.from('kalkulace').select('*').eq('zakazka_id', params.id).single(),
  ])

  return (
    <ZakazkaDetailContent
      zakazka={zakazka}
      materialy={materialy ?? []}
      dokumenty={dokumenty ?? []}
      ukoly={ukoly ?? []}
      komunikace={komunikace ?? []}
      kalkulace={kalkulace}
    />
  )
}
