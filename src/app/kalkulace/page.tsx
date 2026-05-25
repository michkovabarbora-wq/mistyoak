import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCena } from '@/lib/utils'

export default async function KalkulacePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('kalkulace')
    .select('*, zakazka:zakazky(cislo, typ, zakaznik:zakaznici(jmeno))')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <h1 className="text-xl font-semibold text-oak-900 mb-4">Kalkulace</h1>

      {(!data || data.length === 0) ? (
        <div className="text-center py-12 text-mist-400 text-sm">
          Žádné kalkulace. Vytvořte je v detailu zakázky.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((k: any) => (
            <Link
              key={k.id}
              href={`/zakázky/${k.zakazka_id}`}
              className="card-hover p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-oak-900">
                  {k.zakazka?.zakaznik?.jmeno ?? '—'}
                </p>
                <p className="text-xs text-mist-500">{k.zakazka?.cislo}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-oak-800">{formatCena(k.cena_s_dph)}</p>
                <p className="text-xs text-oak-500">zisk {formatCena(k.zisk)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
