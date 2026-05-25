'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generujCisloZakazky } from '@/lib/utils'
import type { TypZakazky, ZdrojPoptavky, PrioritaZakazky } from '@/types'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function NovaZakazkaForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    // Zákazník
    jmeno: '',
    telefon: '',
    email: '',
    adresa: '',
    // Zakázka
    typ: 'kuchyne' as TypZakazky,
    zdroj: 'doporuceni' as ZdrojPoptavky,
    priorita: 'normal' as PrioritaZakazky,
    termin: '',
    adresa_montaze: '',
    poznamka: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.jmeno.trim()) {
      toast.error('Vyplň jméno zákazníka')
      return
    }

    setLoading(true)
    try {
      // 1. Vytvoř zákazníka
      const { data: zakaznik, error: zErr } = await supabase
        .from('zakaznici')
        .insert({
          jmeno: form.jmeno.trim(),
          telefon: form.telefon.trim() || null,
          email: form.email.trim() || null,
          adresa: form.adresa.trim() || null,
        })
        .select('id')
        .single()

      if (zErr) throw zErr

      // 2. Zjisti počet zakázek pro číslo
      const { count } = await supabase
        .from('zakazky')
        .select('id', { count: 'exact', head: true })

      const cislo = generujCisloZakazky(count ?? 0)

      // 3. Vytvoř zakázku
      const { data: zakazka, error: zakErr } = await supabase
        .from('zakazky')
        .insert({
          cislo,
          zakaznik_id: zakaznik.id,
          typ: form.typ,
          stav: 'poptavka',
          priorita: form.priorita,
          zdroj: form.zdroj || null,
          termin: form.termin || null,
          adresa_montaze: form.adresa_montaze.trim() || null,
          poznamka: form.poznamka.trim() || null,
        })
        .select('id')
        .single()

      if (zakErr) throw zakErr

      toast.success(`Zakázka ${cislo} vytvořena!`)
      router.push(`/zakázky/${zakazka.id}`)
    } catch (err: any) {
      console.error(err)
      toast.error('Chyba při ukládání: ' + (err.message ?? 'Neznámá chyba'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/zakázky" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Zpět
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
          Uložit zakázku
        </button>
      </div>

      <h1 className="text-xl font-semibold text-oak-900 mb-6">Nová zakázka</h1>

      {/* Zákazník */}
      <div className="card p-4 mb-4">
        <p className="section-label mb-3">Zákazník</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-mist-500 mb-1 block">Jméno a příjmení *</label>
            <input
              className="input"
              placeholder="Jan Novák"
              value={form.jmeno}
              onChange={e => set('jmeno', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-mist-500 mb-1 block">Telefon</label>
              <input
                className="input"
                placeholder="+420 601 234 567"
                value={form.telefon}
                onChange={e => set('telefon', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-mist-500 mb-1 block">E-mail</label>
              <input
                className="input"
                placeholder="jan@email.cz"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-mist-500 mb-1 block">Adresa zákazníka</label>
            <input
              className="input"
              placeholder="Ulice 12, Praha 1"
              value={form.adresa}
              onChange={e => set('adresa', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Zakázka */}
      <div className="card p-4 mb-4">
        <p className="section-label mb-3">Zakázka</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-mist-500 mb-1 block">Typ zakázky</label>
              <select
                className="input"
                value={form.typ}
                onChange={e => set('typ', e.target.value)}
              >
                <option value="kuchyne">Kuchyně</option>
                <option value="satna">Šatna</option>
                <option value="obyvak">Obývák</option>
                <option value="koupelna">Koupelna</option>
                <option value="loznice">Ložnice</option>
                <option value="pracovna">Pracovna</option>
                <option value="jine">Jiné</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-mist-500 mb-1 block">Priorita</label>
              <select
                className="input"
                value={form.priorita}
                onChange={e => set('priorita', e.target.value)}
              >
                <option value="nizka">Nízká</option>
                <option value="normal">Normální</option>
                <option value="vysoka">Vysoká</option>
                <option value="urgent">Urgentní 🔥</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-mist-500 mb-1 block">Zdroj poptávky</label>
              <select
                className="input"
                value={form.zdroj}
                onChange={e => set('zdroj', e.target.value)}
              >
                <option value="doporuceni">Doporučení</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="web">Web</option>
                <option value="telefon">Telefon</option>
                <option value="jine">Jiné</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-mist-500 mb-1 block">Termín</label>
              <input
                type="date"
                className="input"
                value={form.termin}
                onChange={e => set('termin', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-mist-500 mb-1 block">Adresa montáže</label>
            <input
              className="input"
              placeholder="Ulice 12, Praha 1 (pokud jiná než zákazník)"
              value={form.adresa_montaze}
              onChange={e => set('adresa_montaze', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-mist-500 mb-1 block">Poznámka</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="První dojem, požadavky zákazníka, poznámky z hovoru…"
              value={form.poznamka}
              onChange={e => set('poznamka', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Uložit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full justify-center py-3"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Save className="w-4 h-4" />}
        Uložit zakázku
      </button>
    </div>
  )
}
