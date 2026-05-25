'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, FAZE_LABELS, TYP_LABELS, formatDatum } from '@/lib/utils'
import { TerminChip } from '@/components/ui'
import type { Zakazka, FazeVyroby } from '@/types'
import toast from 'react-hot-toast'

const FAZE_ORDER: FazeVyroby[] = [
  'pripraven', 'objednan_material', 'rezani',
  'olepovani', 'cnc_vrtani', 'kompletace',
  'pripraveno_k_montazi', 'hotovo',
]

export function VyrobaKanban({ zakazky: initialZakazky }: { zakazky: Zakazka[] }) {
  const [zakazky, setZakazky] = useState(initialZakazky)
  const supabase = createClient()

  async function posunFazi(zakazka: Zakazka, novaFaze: FazeVyroby) {
    setZakazky(prev =>
      prev.map(z => z.id === zakazka.id ? { ...z, faze_vyroby: novaFaze } : z)
    )
    const { error } = await supabase
      .from('zakazky')
      .update({ faze_vyroby: novaFaze })
      .eq('id', zakazka.id)
    if (error) {
      setZakazky(prev =>
        prev.map(z => z.id === zakazka.id ? { ...z, faze_vyroby: zakazka.faze_vyroby } : z)
      )
      toast.error('Nepodařilo se aktualizovat')
    } else {
      toast.success(`Přesunuto: ${FAZE_LABELS[novaFaze]}`)
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-semibold text-oak-900 mb-4">Výroba</h1>

      {/* Horizontální scroll kanban na mobilu, grid na desktopu */}
      <div className="flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible">
        {FAZE_ORDER.map(faze => {
          const karty = zakazky.filter(z => z.faze_vyroby === faze)
          return (
            <div key={faze} className="flex-shrink-0 w-64 md:w-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-mist-500 uppercase tracking-wider">
                  {FAZE_LABELS[faze]}
                </p>
                {karty.length > 0 && (
                  <span className="text-xs bg-mist-100 text-mist-500 rounded-full px-2 py-0.5">
                    {karty.length}
                  </span>
                )}
              </div>

              <div className="space-y-2 min-h-[80px]">
                {karty.map(z => (
                  <KanbanKarta
                    key={z.id}
                    zakazka={z}
                    fazaOrder={FAZE_ORDER}
                    onPosun={posunFazi}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanKarta({
  zakazka, fazaOrder, onPosun,
}: {
  zakazka: Zakazka
  fazaOrder: FazeVyroby[]
  onPosun: (z: Zakazka, f: FazeVyroby) => void
}) {
  const currentIdx = fazaOrder.indexOf(zakazka.faze_vyroby ?? 'pripraven')
  const nextFaze = fazaOrder[currentIdx + 1]

  return (
    <div className="bg-white border border-birch-200 rounded-xl p-3 shadow-card">
      <Link href={`/zakázky/${zakazka.id}`}>
        <p className="text-sm font-medium text-oak-900 hover:text-oak-600 transition-colors">
          {(zakazka as any).zakaznik?.jmeno ?? '—'}
        </p>
        <p className="text-xs text-mist-500 mt-0.5">{TYP_LABELS[zakazka.typ]}</p>
        <div className="mt-2">
          <TerminChip termin={zakazka.termin} />
        </div>
      </Link>

      {nextFaze && (
        <button
          onClick={() => onPosun(zakazka, nextFaze)}
          className="mt-3 w-full text-xs text-center py-1.5 rounded-lg bg-oak-50 text-oak-600 hover:bg-oak-100 transition-colors font-medium"
        >
          → {FAZE_LABELS[nextFaze]}
        </button>
      )}
    </div>
  )
}
