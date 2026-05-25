import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Zakazka, Material, Ukol, KomunikaceZaznam } from '@/types'

interface Props {
  params: { id: string }
}

const STAV_LABELS: Record<string, string> = {
  poptavka: 'Poptávka', zamereni: 'Zaměření', navrh: 'Návrh',
  naceneni: 'Nacenění', schvaleno: 'Schváleno', vyroba: 'Výroba',
  montaz: 'Montáž', hotovo: 'Hotovo', storno: 'Storno',
}
const STAV_COLORS: Record<string, string> = {
  poptavka: 'bg-gray-100 text-gray-700', zamereni: 'bg-blue-100 text-blue-700',
  navrh: 'bg-purple-100 text-purple-700', naceneni: 'bg-yellow-100 text-yellow-700',
  schvaleno: 'bg-green-100 text-green-700', vyroba: 'bg-orange-100 text-orange-700',
  montaz: 'bg-cyan-100 text-cyan-700', hotovo: 'bg-emerald-100 text-emerald-700',
  storno: 'bg-red-100 text-red-700',
}
const PRIORITA_COLORS: Record<string, string> = {
  nizka: 'text-gray-400', normal: 'text-blue-400',
  vysoka: 'text-orange-400', urgent: 'text-red-500',
}
const TYP_LABELS: Record<string, string> = {
  kuchyne: '🍳 Kuchyně', satna: '👔 Šatna', obyvak: '🛋 Obývák',
  koupelna: '🚿 Koupelna', loznice: '🛏 Ložnice', pracovna: '💼 Pracovna', jine: 'Jiné',
}

export default async function ZakazkaDetailPage({ params }: Props) {
  const supabase = await createClient()

  const { data: zakazka } = await supabase
    .from('zakazky')
    .select('*, zakaznik:zakaznici(jmeno, telefon, email, adresa)')
    .eq('id', params.id)
    .single()

  if (!zakazka) notFound()

  const z = zakazka as Zakazka

  const { data: materialy } = await supabase
    .from('materialy')
    .select('*')
    .eq('zakazka_id', params.id)
    .order('created_at', { ascending: false })

  const { data: ukoly } = await supabase
    .from('ukoly')
    .select('*')
    .eq('zakazka_id', params.id)
    .order('datum', { ascending: true })

  const { data: komunikace } = await supabase
    .from('komunikace_zaznamy')
    .select('*')
    .eq('zakazka_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const stavColor = STAV_COLORS[z.stav] ?? 'bg-gray-100 text-gray-700'
  const stavLabel = STAV_LABELS[z.stav] ?? z.stav
  const prioritaColor = PRIORITA_COLORS[z.priorita] ?? 'text-gray-400'
  const typLabel = TYP_LABELS[z.typ] ?? z.typ

  const terminDate = z.termin ? new Date(z.termin) : null
  const terminStr = terminDate
    ? terminDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const terminPast = terminDate ? terminDate < new Date() : false

  const zisk = z.zisk ?? 0
  const cena = z.cena_zakaznik ?? 0
  const naklady = z.naklady_celkem ?? 0
  const marze = cena > 0 ? Math.round((zisk / cena) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Link href="/zakazky" className="hover:text-gray-800">Zakázky</Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">{z.cislo}</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{z.cislo}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stavColor}`}>
                  {stavLabel}
                </span>
                <span className={`text-sm font-semibold ${prioritaColor}`}>
                  {z.priorita === 'urgent' ? '🔴 URGENT' : z.priorita === 'vysoka' ? '🟠 Vysoká' : z.priorita === 'normal' ? '🔵 Normální' : '⚪ Nízká'}
                </span>
              </div>
              <p className="text-gray-500 mt-1">{typLabel}{z.zakaznik ? ` · ${(z.zakaznik as any).jmeno}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/zakazky/${params.id}/pro100`}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                📥 PRO100 import
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Levý sloupec */}
        <div className="lg:col-span-2 space-y-6">

          {/* Zákazník */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Zákazník</h2>
            {z.zakaznik ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-900">{(z.zakaznik as any).jmeno}</p>
                {(z.zakaznik as any).telefon && (
                  <a href={`tel:${(z.zakaznik as any).telefon}`} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
                    <span>📞</span> {(z.zakaznik as any).telefon}
                  </a>
                )}
                {(z.zakaznik as any).email && (
                  <a href={`mailto:${(z.zakaznik as any).email}`} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
                    <span>✉️</span> {(z.zakaznik as any).email}
                  </a>
                )}
                {(z.zakaznik as any).adresa && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <span>📍</span> {(z.zakaznik as any).adresa}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Zákazník není přiřazen</p>
            )}
          </div>

          {/* Detaily zakázky */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Detaily</h2>
            <dl className="grid grid-cols-2 gap-4">
              {terminStr && (
                <>
                  <dt className="text-sm text-gray-500">Termín montáže</dt>
                  <dd className={`text-sm font-medium ${terminPast && z.stav !== 'hotovo' ? 'text-red-600' : 'text-gray-900'}`}>
                    {terminStr} {terminPast && z.stav !== 'hotovo' ? '⚠️' : ''}
                  </dd>
                </>
              )}
              {z.adresa_montaze && (
                <>
                  <dt className="text-sm text-gray-500">Adresa montáže</dt>
                  <dd className="text-sm font-medium text-gray-900">{z.adresa_montaze}</dd>
                </>
              )}
              {z.zdroj && (
                <>
                  <dt className="text-sm text-gray-500">Zdroj poptávky</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{z.zdroj}</dd>
                </>
              )}
              {z.faze_vyroby && (
                <>
                  <dt className="text-sm text-gray-500">Fáze výroby</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{z.faze_vyroby.replace(/_/g, ' ')}</dd>
                </>
              )}
              <dt className="text-sm text-gray-500">Vytvořeno</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(z.created_at).toLocaleDateString('cs-CZ')}
              </dd>
            </dl>
            {z.poznamka && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-sm text-gray-700">{z.poznamka}</p>
              </div>
            )}
          </div>

          {/* Materiály */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Materiál</h2>
              <span className="text-xs text-gray-400">{(materialy ?? []).length} položek</span>
            </div>
            {(materialy ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">Žádný materiál — použijte PRO100 import nebo přidejte ručně.</p>
            ) : (
              <div className="space-y-2">
                {(materialy as Material[]).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.nazev}</p>
                      <p className="text-xs text-gray-400">{m.kategorie}{m.dodavatel ? ` · ${m.dodavatel}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{m.pocet} {m.jednotka}</p>
                      {m.cena_ks && <p className="text-xs text-gray-400">{(m.pocet * m.cena_ks).toLocaleString('cs-CZ')} Kč</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Úkoly */}
          {(ukoly ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Úkoly</h2>
              <div className="space-y-2">
                {(ukoly as Ukol[]).map((u) => (
                  <div key={u.id} className={`flex items-start gap-3 py-2 ${u.splneno ? 'opacity-50' : ''}`}>
                    <span>{u.splneno ? '✅' : '⬜'}</span>
                    <div className="flex-1">
                      <p className={`text-sm ${u.splneno ? 'line-through text-gray-400' : 'text-gray-800'}`}>{u.text}</p>
                      {u.datum && <p className="text-xs text-gray-400">{new Date(u.datum).toLocaleDateString('cs-CZ')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Komunikace */}
          {(komunikace ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Komunikace</h2>
              <div className="space-y-3">
                {(komunikace as KomunikaceZaznam[]).map((k) => (
                  <div key={k.id} className="flex gap-3">
                    <span className="text-lg">{k.typ === 'telefon' ? '📞' : k.typ === 'email' ? '✉️' : k.typ === 'osobne' ? '🤝' : '📝'}</span>
                    <div>
                      <p className="text-sm text-gray-800">{k.obsah}</p>
                      <p className="text-xs text-gray-400">{new Date(k.created_at).toLocaleDateString('cs-CZ')}{k.autor ? ` · ${k.autor}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pravý sloupec — kalkulace */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Kalkulace</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Cena zákazník</span>
                <span className="text-base font-bold text-gray-900">
                  {cena > 0 ? `${cena.toLocaleString('cs-CZ')} Kč` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Náklady</span>
                <span className="text-sm font-medium text-gray-700">
                  {naklady > 0 ? `${naklady.toLocaleString('cs-CZ')} Kč` : '—'}
                </span>
              </div>
              {zisk !== 0 && (
                <div className={`flex justify-between items-center pt-2 border-t border-gray-100`}>
                  <span className="text-sm text-gray-500">Zisk ({marze} %)</span>
                  <span className={`text-sm font-bold ${zisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {zisk.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              )}
            </div>
            {cena === 0 && naklady === 0 && (
              <p className="text-xs text-gray-400 mt-3">Kalkulace zatím není vyplněna.</p>
            )}
          </div>

          {/* Stav pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Průběh</h2>
            <div className="space-y-1">
              {Object.entries(STAV_LABELS).filter(([k]) => k !== 'storno').map(([key, label]) => {
                const stavOrder = ['poptavka','zamereni','navrh','naceneni','schvaleno','vyroba','montaz','hotovo']
                const currentIdx = stavOrder.indexOf(z.stav)
                const thisIdx = stavOrder.indexOf(key)
                const isDone = thisIdx < currentIdx
                const isCurrent = key === z.stav
                return (
                  <div key={key} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${isCurrent ? 'bg-indigo-50' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? '✓' : thisIdx + 1}
                    </span>
                    <span className={`text-sm ${isCurrent ? 'font-semibold text-indigo-700' : isDone ? 'text-gray-400' : 'text-gray-500'}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
