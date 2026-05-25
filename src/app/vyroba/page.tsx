import { createClient } from '@/lib/supabase/server'
import { VyrobaKanban } from './VyrobaKanban'
import type { Zakazka } from '@/types'

export default async function VyrobaPage() {
  const supabase = await createClient()

  const { data: zakazky } = await supabase
    .from('zakazky')
    .select('*, zakaznik:zakaznici(jmeno)')
    .eq('stav', 'vyroba')
    .order('termin', { ascending: true })

  return <VyrobaKanban zakazky={(zakazky as Zakazka[]) ?? []} />
}
