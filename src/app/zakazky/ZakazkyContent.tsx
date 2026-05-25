'use client'

import { useState, useMemo } from 'react'
import { ZakazkaCard } from '@/components/zakázky/ZakazkaCard'
import { EmptyState } from '@/components/ui'
import { STAV_LABELS } from '@/lib/utils'
import type { Zakazka, StavZakazky } from '@/types'
import { Search, Plus, Inbox } from 'lucide-react'
import Link from 'next/link'

const FILTERS: { key: StavZakazky | 'vse'; label: string }[] = [
  { key: 'vse',       label: 'Vše' },
  { key: 'poptavka',  label: 'Poptávky' },
  { key: 'vyroba',    label: 'Výroba' },
  { key: 'montaz',    label: 'Montáž' },
  { key: 'hotovo',    label: 'Hotovo' },
]

export function ZakazkyContent({ zakazky }: { zakazky: Zakazka[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StavZakazky | 'vse'>('vse')

  const filtered = useMemo(() => {
    return zakazky.filter(z => {
      const matchFilter = filter === 'vse' || z.stav === filter
      const q = query.toLowerCase()
      const matchQuery = !q
        || z.cislo.toLowerCase().includes(q)
        || (z.zakaznik as any)?.jmeno?.toLowerCase().includes(q)
        || (z.adresa_montaze ?? '').toLowerCase().includes(q)
      return matchFilter && matchQuery
    })
  }, [zakazky, query, filter])

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-oak-900">Zakázky</h1>
        <Link href="/zakazky/nova" className="btn-primary">
          <Plus className="w-4 h-4" />
          Nová
        </Link>
      </div>

      {/* Hledání */}
      <div className="flex items-center gap-2 bg-white border border-birch-200 rounded-xl px-3 py-2 mb-3">
        <Search className="w-4 h-4 text-mist-400 flex-shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Hledat zákazníka, číslo zakázky…"
          className="flex-1 text-sm outline-none bg-transparent text-oak-900 placeholder:text-mist-400"
        />
      </div>

      {/* Filtry */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${
              filter === f.key
                ? 'bg-oak-500 text-white border-oak-500'
                : 'bg-white text-mist-500 border-birch-200 hover:border-oak-300'
            }`}
          >
            {f.label}
            {f.key !== 'vse' && (
              <span className="ml-1 opacity-60">
                {zakazky.filter(z => z.stav === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Seznam */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title={query ? 'Nic nenalezeno' : 'Zatím žádné zakázky'}
          description={query ? `Zkus jiný dotaz` : 'Přidej první zakázku tlačítkem výše'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(z => <ZakazkaCard key={z.id} zakazka={z} />)}
        </div>
      )}
    </div>
  )
}
