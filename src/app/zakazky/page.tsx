import { createClient } from '@/lib/supabase/server'
import { ZakazkyContent } from './ZakazkyContent'
import type { Zakazka } from '@/types'

export default async function ZakazkyPage() {
  const supabase = await createClient()

  const { data: zakazky } = await supabase
    .from('zakazky')
    .select('*, zakaznik:zakaznici(jmeno, telefon, email)')
    .order('updated_at', { ascending: false })

  return <ZakazkyContent zakazky={(zakazky as Zakazka[]) ?? []} />
}
