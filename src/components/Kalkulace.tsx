'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  zakazkaId: string
}

interface MatPolozka {
  id: string
  nazev: string
  jednotka: string
  mnozstvi: number
  cenaKs: number
  rezerva?: boolean
  m2?: number
  je3mm?: boolean
  typ: 'material' | 'prace'
}

interface Kalkulace {
  id?: string
  zakazka_id: string
  polozky: MatPolozka[]
  marze_procent: number
  sleva: number
  dph_procent: number
  naklady_celkem: number
  cena_bez_dph: number
  cena_s_dph: number
  zisk: number
}

const DEFAULT_PRESETS = [
  { nazev: 'Práce truhlář', jednotka: 'hod', cena: 550 },
  { nazev: 'Montáž na místě', jednotka: 'hod', cena: 450 },
  { nazev: 'Doprava', jednotka: 'km', cena: 12 },
  { nazev: 'Projekt / vizualizace', jednotka: 'ks', cena: 3500 },
  { nazev: 'Zaměření', jednotka: 'ks', cena: 500 },
]

function fkc(n: number) {
  return Number(n || 0).toLocaleString('cs-CZ')
}

function uid() {
  return 'i' + Date.now() + Math.random().toString(36).slice(2, 5)
}

export function Kalkulace({ zakazkaId }: Props) {
  const supabase = createClient()
  const [kal, setKal] = useState<Kalkulace>({
    zakazka_id: zakazkaId,
    polozky: [],
    marze_procent: 30,
    sleva: 0,
    dph_procent: 21,
    naklady_celkem: 0,
    cena_bez_dph: 0,
    cena_s_dph: 0,
    zisk: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // ── Načti kalkulaci ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('kalkulace')
        .select('*')
        .eq('zakazka_id', zakazkaId)
        .maybeSingle()

      if (data) {
        setKal({
          ...data,
          polozky: data.polozky || [],
        })
      }
      setLoading(false)
    }
    load()
  }, [zakazkaId])

  // ── Výpočty ──────────────────────────────────────────────────────────────
  const vypocitej = useCallback((polozky: MatPolozka[], marze: number, sleva: number, dph: number) => {
    const naklady = polozky.reduce((s, p) => {
      const mnoz = (p.mnozstvi || 0) + (p.rezerva ? 1 : 0)
      return s + mnoz * (p.cenaKs || 0)
    }, 0)
    const cena_bez_dph = Math.round(naklady * (1 + marze / 100) - sleva)
    const cena_s_dph = Math.round(cena_bez_dph * (1 + dph / 100))
    const zisk = cena_bez_dph - naklady
    return { naklady_celkem: Math.round(naklady), cena_bez_dph, cena_s_dph, zisk }
  }, [])

  // ── Uložit do Supabase ───────────────────────────────────────────────────
  const ulozit = useCallback(async (novyKal: Kalkulace) => {
    setSaving(true)
    const vypocet = vypocitej(novyKal.polozky, novyKal.marze_procent, novyKal.sleva, novyKal.dph_procent)
    const data = { ...novyKal, ...vypocet, updated_at: new Date().toISOString() }

    if (novyKal.id) {
      await supabase.from('kalkulace').update(data).eq('id', novyKal.id)
    } else {
      const { data: inserted } = await supabase.from('kalkulace').insert(data).select().single()
      if (inserted) data.id = inserted.id
    }

    // Aktualizuj denormalizovaná pole na zakázce
    await supabase.from('zakazky').update({
      cena_zakaznik: vypocet.cena_s_dph,
      naklady_celkem: vypocet.naklady_celkem,
      zisk: vypocet.zisk,
    }).eq('id', zakazkaId)

    setKal({ ...data })
    setSaving(false)
  }, [zakazkaId, vypocitej])

  // ── Pomocné akce ─────────────────────────────────────────────────────────
  const updatePolozka = (id: string, field: keyof MatPolozka, value: unknown) => {
    const nove = kal.polozky.map(p => p.id === id ? { ...p, [field]: value } : p)
    const novyKal = { ...kal, polozky: nove }
    setKal(novyKal)
    ulozit(novyKal)
  }

  const smazatPolozku = (id: string) => {
    const nove = kal.polozky.filter(p => p.id !== id)
    const novyKal = { ...kal, polozky: nove }
    setKal(novyKal)
    ulozit(novyKal)
  }

  const pridatPolozku = (typ: 'material' | 'prace', nazev = 'Nová položka', jednotka = 'ks', cenaKs = 0) => {
    const nova: MatPolozka = { id: uid(), nazev, jednotka, mnozstvi: 1, cenaKs, typ }
    const nove = [...kal.polozky, nova]
    const novyKal = { ...kal, polozky: nove }
    setKal(novyKal)
    ulozit(novyKal)
    setEditId(nova.id)
  }

  const togRezerva = (id: string) => {
    const pol = kal.polozky.find(p => p.id === id)
    if (!pol) return
    updatePolozka(id, 'rezerva', !pol.rezerva)
  }

  const updateMarze = (val: number) => {
    const novyKal = { ...kal, marze_procent: val }
    setKal(novyKal)
    ulozit(novyKal)
  }

  const updateSleva = (val: number) => {
    const novyKal = { ...kal, sleva: val }
    setKal(novyKal)
    ulozit(novyKal)
  }

  // ── Výpočet aktuálních hodnot ────────────────────────────────────────────
  const vypocet = vypocitej(kal.polozky, kal.marze_procent, kal.sleva, kal.dph_procent)
  const matPolozky = kal.polozky.filter(p => p.typ === 'material')
  const pracePolozky = kal.polozky.filter(p => p.typ === 'prace')
  const sumMat = matPolozky.reduce((s, p) => s + ((p.mnozstvi || 0) + (p.rezerva ? 1 : 0)) * (p.cenaKs || 0), 0)
  const sumPrace = pracePolozky.reduce((s, p) => s + (p.mnozstvi || 0) * (p.cenaKs || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">Načítám kalkulaci…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── SOUHRN ── */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Cena pro zákazníka (vč. DPH)</p>
            <p className="text-3xl font-bold text-green-700">{fkc(vypocet.cena_s_dph)} Kč</p>
          </div>
          <div className="text-right text-sm text-gray-500 space-y-0.5">
            <div>Náklady: <span className="font-medium text-gray-700">{fkc(vypocet.naklady_celkem)} Kč</span></div>
            <div>Bez DPH: <span className="font-medium text-gray-700">{fkc(vypocet.cena_bez_dph)} Kč</span></div>
            <div>Zisk: <span className="font-semibold text-green-600">{fkc(vypocet.zisk)} Kč</span></div>
            {kal.sleva > 0 && (
              <div>Sleva: <span className="font-medium text-orange-600">−{fkc(kal.sleva)} Kč</span></div>
            )}
          </div>
        </div>

        {/* Marže slider */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 whitespace-nowrap">Marže:</span>
          <input
            type="range" min={0} max={100} value={kal.marze_procent}
            onChange={e => updateMarze(Number(e.target.value))}
            className="flex-1 max-w-[140px] accent-green-600"
          />
          <span className="text-sm font-bold text-gray-700 min-w-[36px]">{kal.marze_procent}%</span>
          <span className="text-xs text-gray-400">
            Mat: {fkc(Math.round(sumMat))} · Práce: {fkc(Math.round(sumPrace))} Kč
          </span>
        </div>

        {/* Sleva */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Sleva:</span>
          <input
            type="number" min={0} value={kal.sleva}
            onChange={e => updateSleva(Number(e.target.value))}
            className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right font-medium"
          />
          <span className="text-xs text-gray-400">Kč</span>
          {saving && <span className="text-xs text-gray-400 ml-auto">Ukládám…</span>}
        </div>
      </div>

      {/* ── MATERIÁL ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">📦 Materiál</h3>
            {sumMat > 0 && <p className="text-xs text-gray-400">celkem {fkc(Math.round(sumMat))} Kč</p>}
          </div>
          <button
            onClick={() => pridatPolozku('material')}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors"
          >
            + Přidat
          </button>
        </div>

        {matPolozky.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            Žádné položky — importuj z Pro100 nebo přidej ručně.
          </p>
        ) : (
          <div className="space-y-2">
            {matPolozky.map(p => (
              <PolozkaRow
                key={p.id}
                polozka={p}
                isEditing={editId === p.id}
                onEdit={() => setEditId(editId === p.id ? null : p.id)}
                onUpdate={(field, val) => updatePolozka(p.id, field, val)}
                onDelete={() => smazatPolozku(p.id)}
                onTogRezerva={() => togRezerva(p.id)}
                showRezerva
              />
            ))}
          </div>
        )}
      </div>

      {/* ── PRÁCE & OSTATNÍ ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">🔨 Práce & ostatní</h3>
            {sumPrace > 0 && <p className="text-xs text-gray-400">celkem {fkc(Math.round(sumPrace))} Kč</p>}
          </div>
          <button
            onClick={() => pridatPolozku('prace')}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors"
          >
            + Přidat
          </button>
        </div>

        {/* Rychlé presety */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {DEFAULT_PRESETS.map(p => (
            <button
              key={p.nazev}
              onClick={() => pridatPolozku('prace', p.nazev, p.jednotka, p.cena)}
              className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              {p.nazev}
            </button>
          ))}
        </div>

        {pracePolozky.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Žádné položky — klikni na preset výše nebo přidej ručně.</p>
        ) : (
          <div className="space-y-2">
            {pracePolozky.map(p => (
              <PolozkaRow
                key={p.id}
                polozka={p}
                isEditing={editId === p.id}
                onEdit={() => setEditId(editId === p.id ? null : p.id)}
                onUpdate={(field, val) => updatePolozka(p.id, field, val)}
                onDelete={() => smazatPolozku(p.id)}
                onTogRezerva={() => {}}
                showRezerva={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── DPH nastavení ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">⚙️ Nastavení</h3>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <label className="text-gray-500">DPH:</label>
          <select
            value={kal.dph_procent}
            onChange={e => {
              const novyKal = { ...kal, dph_procent: Number(e.target.value) }
              setKal(novyKal)
              ulozit(novyKal)
            }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
          >
            <option value={0}>0 %</option>
            <option value={12}>12 %</option>
            <option value={21}>21 %</option>
          </select>
          <span className="text-gray-400 text-xs">
            Cena bez DPH: {fkc(vypocet.cena_bez_dph)} Kč → s DPH: {fkc(vypocet.cena_s_dph)} Kč
          </span>
        </div>
      </div>

    </div>
  )
}

// ── Řádek položky ────────────────────────────────────────────────────────────
interface PolozkaRowProps {
  polozka: MatPolozka
  isEditing: boolean
  onEdit: () => void
  onUpdate: (field: keyof MatPolozka, val: unknown) => void
  onDelete: () => void
  onTogRezerva: () => void
  showRezerva: boolean
}

function PolozkaRow({ polozka: p, isEditing, onEdit, onUpdate, onDelete, onTogRezerva, showRezerva }: PolozkaRowProps) {
  const mnozCelkem = (p.mnozstvi || 0) + (p.rezerva ? 1 : 0)
  const celkem = Math.round(mnozCelkem * (p.cenaKs || 0))

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Hlavní řádek */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              className="w-full text-sm font-medium border border-indigo-300 rounded px-2 py-0.5"
              value={p.nazev}
              onChange={e => onUpdate('nazev', e.target.value)}
              onBlur={onEdit}
              onKeyDown={e => e.key === 'Enter' && onEdit()}
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-sm font-medium text-gray-800 cursor-pointer hover:text-indigo-600"
                onClick={onEdit}
                title="Klikni pro editaci"
              >
                {p.nazev}
              </span>
              {p.je3mm && (
                <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">HDF 3mm</span>
              )}
              {p.m2 && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{p.m2.toFixed(2)} m²</span>
              )}
              {p.rezerva && (
                <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">+1 rezerva</span>
              )}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">{p.jednotka} · {fkc(p.cenaKs || 0)} Kč/j.</div>
        </div>

        {/* Množství */}
        <input
          type="number" min={0} step="0.1"
          value={p.mnozstvi}
          onChange={e => onUpdate('mnozstvi', parseFloat(e.target.value) || 0)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right"
        />

        {/* Rezerva tlačítko */}
        {showRezerva && (
          <button
            onClick={onTogRezerva}
            title={p.rezerva ? 'Rezerva přidána – klikni pro odebrání' : 'Přidat 1 desku jako rezervu'}
            className={`px-2 py-1 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap ${
              p.rezerva
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
            }`}
          >
            {p.rezerva ? '✓ +1' : '+1'}
          </button>
        )}

        {/* Cena za ks */}
        <input
          type="number" min={0}
          value={p.cenaKs}
          onChange={e => onUpdate('cenaKs', parseFloat(e.target.value) || 0)}
          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right"
        />

        {/* Celkem */}
        <span className="text-sm font-semibold text-gray-900 min-w-[72px] text-right whitespace-nowrap">
          {fkc(celkem)} Kč
        </span>

        {/* Smazat */}
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none ml-1"
          title="Smazat"
        >
          ×
        </button>
      </div>
    </div>
  )
}

