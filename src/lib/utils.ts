import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { StavZakazky, TypZakazky, PrioritaZakazky, FazeVyroby } from '@/types'

// ─── CSS utility ──────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Datum ────────────────────────────────────────────────────────────────────

export function formatDatum(date: string | null): string {
  if (!date) return '—'
  return format(new Date(date), 'd. M. yyyy', { locale: cs })
}

export function formatDatumKratky(date: string | null): string {
  if (!date) return '—'
  return format(new Date(date), 'd. M.', { locale: cs })
}

export function relativniDatum(date: string | null): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs })
}

export function dniDoTerminu(date: string | null): number | null {
  if (!date) return null
  return differenceInDays(new Date(date), new Date())
}

export function jePoTerminu(date: string | null): boolean {
  if (!date) return false
  return isPast(new Date(date))
}

// ─── Popisky stavů ────────────────────────────────────────────────────────────

export const STAV_LABELS: Record<StavZakazky, string> = {
  poptavka:  'Poptávka',
  zamereni:  'Zaměření',
  navrh:     'Návrh',
  naceneni:  'Nacenění',
  schvaleno: 'Schváleno',
  vyroba:    'Výroba',
  montaz:    'Montáž',
  hotovo:    'Hotovo',
  storno:    'Storno',
}

export const STAV_ORDER: StavZakazky[] = [
  'poptavka', 'zamereni', 'navrh', 'naceneni',
  'schvaleno', 'vyroba', 'montaz', 'hotovo',
]

export const TYP_LABELS: Record<TypZakazky, string> = {
  kuchyne:   'Kuchyně',
  satna:     'Šatna',
  obyvak:    'Obývák',
  koupelna:  'Koupelna',
  loznice:   'Ložnice',
  pracovna:  'Pracovna',
  jine:      'Jiné',
}

export const PRIORITA_LABELS: Record<PrioritaZakazky, string> = {
  nizka:  'Nízká',
  normal: 'Normální',
  vysoka: 'Vysoká',
  urgent: 'Urgentní',
}

export const FAZE_LABELS: Record<FazeVyroby, string> = {
  pripraven:               'Připraven',
  objednan_material:       'Objednán materiál',
  rezani:                  'Řezání',
  olepovani:               'Olepování',
  cnc_vrtani:              'CNC / vrtání',
  kompletace:              'Kompletace',
  pripraveno_k_montazi:    'Připraveno k montáži',
  hotovo:                  'Hotovo',
}

// ─── Progress zakázky ─────────────────────────────────────────────────────────

export function stavProgress(stav: StavZakazky): number {
  const idx = STAV_ORDER.indexOf(stav)
  if (idx === -1) return 0
  return Math.round((idx / (STAV_ORDER.length - 1)) * 100)
}

// ─── Peníze ───────────────────────────────────────────────────────────────────

export function formatCena(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Generátor čísla zakázky ──────────────────────────────────────────────────

export function generujCisloZakazky(posledniIndex: number): string {
  const rok = new Date().getFullYear()
  const cislo = String(posledniIndex + 1).padStart(3, '0')
  return `ZAK-${rok}-${cislo}`
}

// ─── Urgentní detekce ────────────────────────────────────────────────────────

export function jeUrgentni(zakazka: { termin: string | null; priorita: PrioritaZakazky }): boolean {
  if (zakazka.priorita === 'urgent') return true
  const dni = dniDoTerminu(zakazka.termin)
  if (dni === null) return false
  return dni <= 3
}
