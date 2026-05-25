'use client'

import Link from 'next/link'
import { StavBadge, StepRail, TerminChip, ProgressBar } from '@/components/ui'
import { cn, stavProgress, TYP_LABELS } from '@/lib/utils'
import type { Zakazka } from '@/types'

interface ZakazkaCardProps {
  zakazka: Zakazka & { zakaznik?: { jmeno: string } }
  className?: string
  compact?: boolean
}

export function ZakazkaCard({ zakazka, className, compact = false }: ZakazkaCardProps) {
  const progress = stavProgress(zakazka.stav)

  return (
    <Link
      href={`/zakázky/${zakazka.id}`}
      className={cn('card-hover block p-4', className)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-oak-900 text-[15px] truncate">
            {zakazka.zakaznik?.jmeno ?? 'Neznámý zákazník'}
          </p>
          <p className="text-xs text-mist-500 mt-0.5">
            {TYP_LABELS[zakazka.typ]} · {zakazka.cislo}
          </p>
        </div>
        <StavBadge stav={zakazka.stav} />
      </div>

      {!compact && (
        <>
          <StepRail stav={zakazka.stav} className="mb-2" />
          <div className="flex items-center justify-between gap-3">
            <TerminChip termin={zakazka.termin} />
            <span className="text-xs text-mist-500">{progress} %</span>
          </div>
          <ProgressBar value={progress} className="mt-1.5" />
        </>
      )}

      {compact && (
        <TerminChip termin={zakazka.termin} />
      )}
    </Link>
  )
}
