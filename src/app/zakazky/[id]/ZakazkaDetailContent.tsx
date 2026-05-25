'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StavBadge, StepRail, TerminChip, ProgressBar } from '@/components/ui'
import {
  cn, TYP_LABELS, formatCena, stavProgress, FAZE_LABELS
} from '@/lib/utils'
import type {
  Zakazka, Material, Dokument, Ukol,
  KomunikaceZaznam, Kalkulace
} from '@/types'
import {
  ArrowLeft, Phone, Mail, MapPin, Package,
  FileText, MessageSquare, CheckSquare, Calculator, Edit
} from 'lucide-react'
import { Kalkulace as KalkulaceKomponenta } from '@/components/Kalkulace'

type Tab = 'prehled' | 'materialy' | 'dokumenty' | 'komunikace' | 'kalkulace'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'prehled',    label: 'Přehled',    icon: <FileText className="w-4 h-4" /> },
  { key: 'materialy',  label: 'Materiály',  icon: <Package className="w-4 h-4" /> },
  { key: 'dokumenty',  label: 'Dokumenty',  icon: <FileText className="w-4 h-4" /> },
  { key: 'kalkulace',  label: 'Kalkulace',  icon: <Calculator className="w-4 h-4" /> },
  { key: 'komunikace', label: 'Komunikace', icon: <MessageSquare className="w-4 h-4" /> },
]

interface Props {
  zakazka: Zakazka & { zakaznik: any }
  materialy: Material[]
  dokumenty: Dokument[]
  ukoly: Ukol[]
  komunikace: KomunikaceZaznam[]
  kalkulace: Kalkulace | null
}

export function ZakazkaDetailContent({
  zakazka, materialy, dokumenty, ukoly, komunikace, kalkulace
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('prehled')
  const progress = stavProgress(zakazka.stav)

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <Link href="/zakazky" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Zakázky
        </Link>
        <Link href={`/zakazky/${zakazka.id}/pro100`} className="btn-primary">
          PRO100
        </Link>
        <Link href={`/zakazky/${zakazka.id}/upravit`} className="btn-secondary">
          <Edit className="w-4 h-4" />
          Upravit
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg font-semibold text-oak-900">
              {zakazka.zakaznik?.jmeno}
            </h1>
            <p className="text-sm text-mist-500">
              {TYP_LABELS[zakazka.typ]} · {zakazka.cislo}
            </p>
          </div>
          <StavBadge stav={zakazka.stav} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {zakazka.zakaznik?.telefon && (
            
              href={`tel:${zakazka.zakaznik.telefon}`}
              className="flex items-center gap-2 text-sm text-oak-600 hover:text-oak-800 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {zakazka.zakaznik.telefon}
            </a>
          )}
          {zakazka.zakaznik?.email && (
            
              href={`mailto:${zakazka.zakaznik.email}`}
              className="flex items-center gap-2 text-sm text-oak-600 hover:text-oak-800 transition-colors truncate"
            >
              <Mail className="w-3.5 h-3.5" />
              {zakazka.zakaznik.email}
            </a>
          )}
          {zakazka.adresa_montaze && (
            <div className="flex items-center gap-2 text-sm text-mist-500 col-span-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {zakazka.adresa_montaze}
            </div>
          )}
        </div>

        <StepRail stav={zakazka.stav} className="mb-2" />
        <div className="flex items-center justify-between">
          <TerminChip termin={zakazka.termin} />
          <span className="text-xs text-mist-400">{progress} %</span>
        </div>
        <ProgressBar value={progress} className="mt-1" />

        {zakazka.cena_zakaznik && (
          <div className="mt-3 pt-3 border-t border-birch-100 flex items-center justify-between">
            <span className="text-xs text-mist-500">Cena pro zákazníka</span>
            <span className="text-sm font-semibold text-oak-800">
              {formatCena(zakazka.cena_zakaznik)}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 flex-shrink-0 text-xs font-medium px-3 py-2 rounded-xl transition-all',
              activeTab === tab.key
                ? 'bg-oak-500 text-white'
                : 'text-mist-500 hover:text-oak-700 hover:bg-birch-100'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'prehled' && <PrehledTab zakazka={zakazka} ukoly={ukoly} />}
      {activeTab === 'materialy' && <MaterialyTab materialy={materialy} zakazkaId={zakazka.id} />}
      {activeTab === 'dokumenty' && <DokumentyTab dokumenty={dokumenty} zakazkaId={zakazka.id} />}
      {activeTab === 'kalkulace' && <KalkulaceTab zakazka={zakazka} />}
      {activeTab === 'komunikace' && <KomunikaceTab komunikace={komunikace} zakazkaId={zakazka.id} />}
    </div>
  )
}

function PrehledTab({ zakazka, ukoly }: { zakazka: Zakazka; ukoly: Ukol[] }) {
  return (
    <div className="space-y-4">
      {zakazka.faze_vyroby && (
        <div className="card p-4">
          <p className="section-label">Aktuální fáze výroby</p>
          <p className="font-medium text-oak-800">{FAZE_LABELS[zakazka.faze_vyroby]}</p>
        </div>
      )}
      {zakazka.poznamka && (
        <div className="card p-4">
          <p className="section-label">Poznámka</p>
          <p className="text-sm text-oak-800 whitespace-pre-wrap">{zakazka.poznamka}</p>
        </div>
      )}
      <div className="card divide-y divide-birch-100">
        <p className="px-4 py-3 section-label">
          Úkoly
          <span className="ml-1 text-mist-400 normal-case">
            ({ukoly.filter(u => u.splneno).length}/{ukoly.length})
          </span>
        </p>
        {ukoly.length === 0 ? (
          <p className="px-4 py-3 text-sm text-mist-400">Žádné úkoly</p>
        ) : (
          ukoly.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <input type="checkbox" checked={u.splneno} readOnly className="w-4 h-4 accent-oak-500" />
              <span className={cn('text-sm', u.splneno && 'line-through text-mist-400')}>{u.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function MaterialyTab({ materialy, zakazkaId }: { materialy: Material[]; zakazkaId: string }) {
  const skupiny = materialy.reduce((acc, m) => {
    if (!acc[m.kategorie]) acc[m.kategorie] = []
    acc[m.kategorie].push(m)
    return acc
  }, {} as Record<string, Material[]>)

  const KATEGORIE_LABELS: Record<string, string> = {
    korpus: 'Korpus', dvírka: 'Dvířka', pracovni_deska: 'Pracovní deska',
    hrany: 'Hrany', kovani: 'Kování', spotrebice: 'Spotřebiče', jine: 'Jiné',
  }

  if (materialy.length === 0) {
    return <p className="text-sm text-mist-400 py-4">Žádné materiály zatím přidány.</p>
  }

  return (
    <div className="space-y-3">
      {Object.entries(skupiny).map(([kat, items]) => (
        <div key={kat} className="card divide-y divide-birch-100">
          <p className="px-4 py-2.5 section-label">{KATEGORIE_LABELS[kat] ?? kat}</p>
          {items.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-oak-800 truncate">{m.nazev}</p>
                {m.dodavatel && <p className="text-xs text-mist-400">{m.dodavatel}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-mist-500">{m.pocet} {m.jednotka}</span>
                <span className={cn('badge text-xs', m.objednano ? 'badge-ok' : 'badge-warn')}>
                  {m.objednano ? 'Objednáno' : 'Čeká'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function DokumentyTab({ dokumenty, zakazkaId }: { dokumenty: Dokument[]; zakazkaId: string }) {
  const TYP_LABELS: Record<string, string> = {
    vizualizace: 'Vizualizace', pro100: 'PRO100',
    foto_zamereni: 'Foto zaměření', foto_montaz: 'Foto montáž',
    pdf_navrh: 'PDF návrh', jine: 'Jiné',
  }

  if (dokumenty.length === 0) {
    return <p className="text-sm text-mist-400 py-4">Žádné dokumenty zatím nahrány.</p>
  }

  return (
    <div className="card divide-y divide-birch-100">
      {dokumenty.map(d => (
        
          key={d.id}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 hover:bg-birch-50 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-oak-800">{d.nazev}</p>
            <p className="text-xs text-mist-400">{TYP_LABELS[d.typ]} · v{d.verze}</p>
          </div>
          {d.je_finalni && <span className="badge-ok">Finální</span>}
        </a>
      ))}
    </div>
  )
}

function KalkulaceTab({ zakazka }: { zakazka: Zakazka }) {
  return <KalkulaceKomponenta zakazkaId={zakazka.id} />
}

function KomunikaceTab({ komunikace, zakazkaId }: { komunikace: KomunikaceZaznam[]; zakazkaId: string }) {
  const TYP_ICONS: Record<string, string> = {
    telefon: '📞', email: '✉️', sms: '💬', osobne: '🤝', poznamka: '📝',
  }

  if (komunikace.length === 0) {
    return <p className="text-sm text-mist-400 py-4">Zatím žádná komunikace.</p>
  }

  return (
    <div className="space-y-2">
      {komunikace.map(k => (
        <div key={k.id} className="card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span>{TYP_ICONS[k.typ] ?? '📝'}</span>
            <span className="text-xs text-mist-400">
              {new Date(k.created_at).toLocaleDateString('cs-CZ', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
          <p className="text-sm text-oak-800 whitespace-pre-wrap">{k.obsah}</p>
        </div>
      ))}
    </div>
  )
}
