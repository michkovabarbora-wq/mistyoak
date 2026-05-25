import { cn, STAV_LABELS, stavProgress, formatDatum, dniDoTerminu } from '@/lib/utils'
import type { StavZakazky, PrioritaZakazky, Zakazka } from '@/types'
import { AlertTriangle, Clock } from 'lucide-react'

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'fire' | 'warn' | 'ok' | 'blue' | 'gray'

export function Badge({
  children,
  variant = 'gray',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={cn(`badge-${variant}`, className)}>
      {children}
    </span>
  )
}

export function StavBadge({ stav }: { stav: StavZakazky }) {
  const variantMap: Record<StavZakazky, BadgeVariant> = {
    poptavka:  'blue',
    zamereni:  'gray',
    navrh:     'gray',
    naceneni:  'warn',
    schvaleno: 'ok',
    vyroba:    'warn',
    montaz:    'ok',
    hotovo:    'ok',
    storno:    'gray',
  }
  return <Badge variant={variantMap[stav]}>{STAV_LABELS[stav]}</Badge>
}

export function PrioritaBadge({ priorita }: { priorita: PrioritaZakazky }) {
  if (priorita === 'nizka' || priorita === 'normal') return null
  return (
    <Badge variant={priorita === 'urgent' ? 'fire' : 'warn'}>
      {priorita === 'urgent' ? '🔥 Urgentní' : '⚠ Vysoká'}
    </Badge>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <div className={cn('h-1 bg-mist-100 rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-oak-400 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ─── Step rail ────────────────────────────────────────────────────────────────

const STAV_ORDER: StavZakazky[] = [
  'poptavka', 'zamereni', 'navrh', 'naceneni',
  'schvaleno', 'vyroba', 'montaz', 'hotovo',
]

export function StepRail({
  stav,
  className,
}: {
  stav: StavZakazky
  className?: string
}) {
  const currentIdx = STAV_ORDER.indexOf(stav)

  return (
    <div className={cn('step-rail', className)}>
      {STAV_ORDER.map((s, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx
        const future = i > currentIdx
        return (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium transition-all',
                done   && 'bg-oak-500 text-white',
                active && 'bg-birch-200 border-2 border-oak-500 text-oak-700',
                future && 'bg-mist-100 text-mist-400 border border-birch-200'
              )}
            >
              {done ? '✓' : i + 1}
            </div>
            {i < STAV_ORDER.length - 1 && (
              <div className={cn(
                'h-px w-4 flex-shrink-0',
                i < currentIdx ? 'bg-oak-300' : 'bg-birch-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Termin chip ──────────────────────────────────────────────────────────────

export function TerminChip({ termin }: { termin: string | null }) {
  if (!termin) return <span className="text-xs text-mist-400">Bez termínu</span>

  const dni = dniDoTerminu(termin)
  const jePoTerminu = dni !== null && dni < 0
  const jeBlizko    = dni !== null && dni >= 0 && dni <= 7

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium',
      jePoTerminu && 'text-red-600',
      jeBlizko    && !jePoTerminu && 'text-amber-600',
      !jeBlizko   && !jePoTerminu && 'text-mist-500',
    )}>
      {jePoTerminu && <AlertTriangle className="w-3 h-3" />}
      {jeBlizko && !jePoTerminu && <Clock className="w-3 h-3" />}
      {formatDatum(termin)}
      {dni !== null && (
        <span className="opacity-70">
          {jePoTerminu
            ? `(${Math.abs(dni)} dní po)`
            : dni === 0
            ? '(dnes)'
            : `(za ${dni} dní)`}
        </span>
      )}
    </span>
  )
}

// ─── Prázdný stav ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 bg-mist-100 rounded-2xl flex items-center justify-center mb-4 text-mist-400">
          {icon}
        </div>
      )}
      <p className="font-medium text-oak-800 mb-1">{title}</p>
      {description && (
        <p className="text-sm text-mist-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-birch-200 rounded-lg', className)} />
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-1 w-full" />
    </div>
  )
}
