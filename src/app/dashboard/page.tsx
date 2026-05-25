import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from './DashboardContent'
import type { Zakazka, Ukol } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: hori },
    { data: blizkeMontaze },
    { data: aktivniZakazky },
    { data: poptavky },
    { data: dnesniUkoly },
  ] = await Promise.all([
    // Hoří – urgentní nebo po termínu
    supabase
      .from('zakazky')
      .select('*, zakaznik:zakaznici(jmeno)')
      .or(`priorita.eq.urgent,termin.lt.${today}`)
      .neq('stav', 'hotovo')
      .neq('stav', 'storno')
      .order('termin', { ascending: true })
      .limit(5),

    // Nejbližší montáže – tento týden
    supabase
      .from('zakazky')
      .select('*, zakaznik:zakaznici(jmeno)')
      .eq('stav', 'montaz')
      .gte('termin', today)
      .lte('termin', weekLater)
      .order('termin', { ascending: true })
      .limit(5),

    // Počet aktivních
    supabase
      .from('zakazky')
      .select('id', { count: 'exact', head: true })
      .not('stav', 'in', '(hotovo,storno)'),

    // Poptávky čekající
    supabase
      .from('zakazky')
      .select('id', { count: 'exact', head: true })
      .eq('stav', 'poptavka'),

    // Dnešní úkoly
    supabase
      .from('ukoly')
      .select('*')
      .eq('splneno', false)
      .or(`datum.eq.${today},datum.is.null`)
      .order('priorita', { ascending: false })
      .limit(8),
  ])

  return (
    <DashboardContent
      hori={(hori as Zakazka[]) ?? []}
      blizkeMontaze={(blizkeMontaze as Zakazka[]) ?? []}
      aktivniZakazky={aktivniZakazky?.length ?? 0}
      poptavkyCekaji={poptavky?.length ?? 0}
      dnesniUkoly={(dnesniUkoly as Ukol[]) ?? []}
    />
  )
}
