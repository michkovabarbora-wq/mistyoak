'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ZakazkaCard } from '@/components/zakázky/ZakazkaCard'
import { EmptyState } from '@/components/ui'
import { cn, formatDatum } from '@/lib/utils'
import type { Zakazka, Ukol } from '@/types'
import {
  Flame, CalendarClock, CheckSquare, Package,
  TrendingUp, Clock, Inbox
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  hori: Zakazka[]
  blizkeMontaze: Zakazka[]
  aktivniZakazky: number
  poptavkyCekaji: number
  dnesniUkoly: Ukol[]
}

export function DashboardContent({
  hori,
  blizkeMontaze,
  aktivniZakazky,
  poptavkyCekaji,
  dnesniUkoly: initialUkoly,
}: Props) {
  const [ukoly, setUkoly] = useState<Ukol[]>(initialUkoly)
  const supabase = createClient()

  const today = new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date())

  async function toggleUkol(id: string, splneno: boolean) {
    setUkoly(prev => prev.map(u => u.id === id ? { ...u, splneno: !splneno } : u))
    const { error } = await supabase
      .from('ukoly')
      .update({ splneno: !splneno })
      .eq('id', id)
    if (error) {
      setUkoly(prev => prev.map(u => u.id === id ? { ...u, splneno } : u))
      toast.error('Nepodařilo se uložit')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

      {/* Hlavička */}
      <div>
        <p className="text-xs text-mist-500 capitalize">{today}</p>
        <h1 className="text-xl font-semibold text-oak-900 mt-0.5">Přehled</h1>
      </div>

      {/* Metriky */}
      <div className="grid grid-cols-2 gap-3">
        <MetrikaCard
          icon={<Flame className="w-4 h-4" />}
          label="Hoří"
          value={hori.length}
          variant={hori.length > 0 ? 'danger' : 'ok'}
          sub="urgentní zakázky"
        />
        <MetrikaCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Aktivní"
          value={aktivniZakazky}
          variant="neutral"
          sub="zakázek ve výrobě"
        />
        <MetrikaCard
          icon={<CalendarClock className="w-4 h-4" />}
          label="Montáže"
          value={blizkeMontaze.length}
          variant={blizkeMontaze.length > 0 ? 'warn' : 'neutral'}
          sub="tento týden"
        />
        <MetrikaCard
          icon={<Inbox className="w-4 h-4" />}
          label="Poptávky"
          value={poptavkyCekaji}
          variant={poptavkyCekaji > 0 ? 'warn' : 'neutral'}
          sub="čekají na odpověď"
        />
      </div>

      {/* Hoří */}
      {hori.length > 0 && (
        <section>
          <div className="section-label flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            Urgentní
          </div>
          <div className="space-y-2">
            {hori.map(z => <ZakazkaCard key={z.id} zakazka={z} />)}
          </div>
        </section>
      )}

      {/* Montáže */}
      {blizkeMontaze.length > 0 && (
        <section>
          <div className="section-label flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-oak-500" />
            Nejbližší montáže
          </div>
          <div className="space-y-2">
            {blizkeMontaze.map(z => (
              <ZakazkaCard key={z.id} zakazka={z} compact />
            ))}
          </div>
        </section>
      )}

      {/* Dnešní úkoly */}
      <section>
        <div className="section-label flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-oak-500" />
          Dnešní úkoly
          <span className="ml-auto text-xs text-mist-400 normal-case tracking-normal">
            {ukoly.filter(u => u.splneno).length}/{ukoly.length}
          </span>
        </div>

        {ukoly.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-5 h-5" />}
            title="Žádné úkoly na dnes"
            description="Přidej úkoly v detailu zakázky"
          />
        ) : (
          <div className="card divide-y divide-birch-100">
            {ukoly.map(ukol => (
              <label
                key={ukol.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-birch-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={ukol.splneno}
                  onChange={() => toggleUkol(ukol.id, ukol.splneno)}
                  className="w-4 h-4 accent-oak-500 rounded"
                />
                <span className={cn(
                  'text-sm flex-1',
                  ukol.splneno && 'line-through text-mist-400'
                )}>
                  {ukol.text}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

// ─── Metrika karta ────────────────────────────────────────────────────────────

function MetrikaCard({
  icon, label, value, sub, variant,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  variant: 'danger' | 'warn' | 'ok' | 'neutral'
}) {
  const colors = {
    danger:  'text-red-600',
    warn:    'text-amber-600',
    ok:      'text-oak-600',
    neutral: 'text-oak-900',
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-mist-500 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={cn('text-3xl font-semibold leading-none', colors[variant])}>
        {value}
      </p>
      <p className="text-xs text-mist-400 mt-1">{sub}</p>
    </div>
  )
}
