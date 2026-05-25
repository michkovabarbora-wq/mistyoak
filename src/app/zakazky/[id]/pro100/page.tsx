'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Typy ────────────────────────────────────────────────────────────────────

interface Dilec {
  sirka: number
  vyska: number
  pocet: number
  hrana_l: number  // 0/1/2
  hrana_p: number
  hrana_h: number
  hrana_d: number
  nazev: string
  material: string
  typ: string
  tloustka: string
}

interface MaterialSpotrebа {
  material: string
  mnozstvi: number
  jednotka: string  // m² nebo m (hrany)
}

interface ElementList {
  nazev: string
  pocet: number
}

interface ParsedData {
  dilce: Dilec[]
  materialy: MaterialSpotrebа[]
  elementy: ElementList[]
  typ: 'naceneni' | 'material' | 'elementy' | 'neznamy'
  nazevSouboru: string
}

// ─── Parser funkcí ────────────────────────────────────────────────────────────

function parseNaceneni(content: string, nazev: string): ParsedData {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const dilce: Dilec[] = []

  // Přeskoč první řádek (název skupiny)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Formát: šířka výška počet hrana_l hrana_p hrana_h hrana_d název#materiál#typ#tloušťka#projekt
    const parts = line.split(/\s+/)
    if (parts.length < 7) continue

    const sirka = parseFloat(parts[0].replace(',', '.'))
    const vyska = parseFloat(parts[1].replace(',', '.'))
    const pocet = parseInt(parts[2])
    const hrana_l = parseInt(parts[3])
    const hrana_p = parseInt(parts[4])
    const hrana_h = parseInt(parts[5])
    const hrana_d = parseInt(parts[6])

    // Zbytek je název dílce oddělený #
    const popis = parts.slice(7).join(' ')
    const popisParts = popis.split('#').map(p => p.trim()).filter(Boolean)

    let nazevDilce = popisParts[2] || popisParts[0] || 'Dílec'
    let material = ''
    let tloustka = ''

    // Hledáme materiál (obsahuje backslash nebo Desky)
    for (const part of popisParts) {
      if (part.includes('\\') || part.includes('mm')) {
        if (part.includes('mm')) {
          tloustka = part
        } else {
          // Extrahuj název materiálu z cesty
          const materialParts = part.split('\\')
          material = materialParts[materialParts.length - 1]
        }
      }
    }

    if (!isNaN(sirka) && !isNaN(vyska) && pocet > 0) {
      dilce.push({
        sirka, vyska, pocet,
        hrana_l, hrana_p, hrana_h, hrana_d,
        nazev: nazevDilce,
        material,
        typ: 'deska',
        tloustka,
      })
    }
  }

  return { dilce, materialy: [], elementy: [], typ: 'naceneni', nazevSouboru: nazev }
}

function parseMaterialConsumption(content: string, nazev: string): ParsedData {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const materialy: MaterialSpotrebа[] = []

  for (const line of lines) {
    // Formát: cesta\k\materiálu\TAB\množství\TAB\jednotka
    const parts = line.split('\t')
    if (parts.length < 3) continue

    const cesтa = parts[0].trim()
    const mnozstvi = parseFloat(parts[1].replace(',', '.'))
    const jednotka = parts[2].trim()

    // Extrahuj název materiálu z cesty
    const cestaParts = cesтa.split('\\')
    const material = cestaParts[cestaParts.length - 1]

    if (!isNaN(mnozstvi)) {
      materialy.push({ material, mnozstvi, jednotka })
    }
  }

  return { dilce: [], materialy, elementy: [], typ: 'material', nazevSouboru: nazev }
}

function parseElementList(content: string, nazev: string): ParsedData {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const elementy: ElementList[] = []

  for (const line of lines) {
    // Formát: název TAB počet
    const parts = line.split('\t')
    if (parts.length < 2) continue

    const nazevEl = parts[0].trim()
    const pocet = parseInt(parts[1].trim())

    if (nazevEl && !isNaN(pocet)) {
      elementy.push({ nazev: nazevEl, pocet })
    }
  }

  return { dilce: [], materialy: [], elementy, typ: 'elementy', nazevSouboru: nazev }
}

function detectAndParse(content: string, nazev: string): ParsedData {
  const lines = content.split('\n').filter(Boolean)
  if (lines.length === 0) return { dilce: [], materialy: [], elementy: [], typ: 'neznamy', nazevSouboru: nazev }

  const firstLine = lines[0]

  // Element list — obsahuje jen název + číslo oddělené tabulátorem
  const tabParts = firstLine.split('\t')
  if (tabParts.length === 2 && !isNaN(parseInt(tabParts[1]))) {
    return parseElementList(content, nazev)
  }

  // Material consumption — obsahuje tabulátory s m² nebo m
  if (firstLine.includes('\t') && (firstLine.includes('m²') || firstLine.includes(' m\t') || firstLine.endsWith('m'))) {
    return parseMaterialConsumption(content, nazev)
  }

  // Nacenění — obsahuje čísla oddělená mezerami na začátku
  const spaceParts = lines[1]?.split(/\s+/) || []
  if (spaceParts.length >= 7 && !isNaN(parseFloat(spaceParts[0]))) {
    return parseNaceneni(content, nazev)
  }

  // Material consumption jako fallback pro soubory s tabulátory
  if (firstLine.includes('\t')) {
    return parseMaterialConsumption(content, nazev)
  }

  return parseNaceneni(content, nazev)
}

// ─── Hlavní komponenta ────────────────────────────────────────────────────────

interface Props {
  zakazkaId: string
}

export function Pro100Importer({ zakazkaId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [parsedFiles, setParsedFiles] = useState<ParsedData[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const parsed = detectAndParse(content, file.name)
      setParsedFiles(prev => {
        // Nahraď pokud už existuje stejný typ
        const filtered = prev.filter(p => p.typ !== parsed.typ || p.nazevSouboru === parsed.nazevSouboru)
        return [...filtered, parsed]
      })
    }
    // Zkus různá kódování
    reader.readAsText(file, 'windows-1250')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(processFile)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(processFile)
  }, [processFile])

  const removeFile = (nazev: string) => {
    setParsedFiles(prev => prev.filter(p => p.nazevSouboru !== nazev))
  }

  async function handleImport() {
    setImporting(true)
    try {
      const materialy: any[] = []

      for (const file of parsedFiles) {
        if (file.typ === 'naceneni') {
          // Dílce → materiály skupiny po materiálech
          const skupiny: Record<string, Dilec[]> = {}
          for (const d of file.dilce) {
            const klic = d.material || 'Neznámý materiál'
            if (!skupiny[klic]) skupiny[klic] = []
            skupiny[klic].push(d)
          }
          for (const [mat, dilce] of Object.entries(skupiny)) {
            const plocha = dilce.reduce((sum, d) => sum + (d.sirka * d.vyska * d.pocet) / 10000, 0)
            materialy.push({
              zakazka_id: zakazkaId,
              kategorie: 'korpus',
              nazev: mat,
              pocet: Math.ceil(plocha * 1.1 * 100) / 100,
              jednotka: 'm²',
              objednano: false,
              poznamka: `Import PRO100 · ${dilce.reduce((s, d) => s + d.pocet, 0)} dílců`,
            })
          }
        }

        if (file.typ === 'material') {
          for (const m of file.materialy) {
            const je_hrana = m.jednotka === 'm' || m.jednotka.startsWith('m ')
            materialy.push({
              zakazka_id: zakazkaId,
              kategorie: je_hrana ? 'hrany' : 'korpus',
              nazev: m.material,
              pocet: Math.ceil(m.mnozstvi * 110) / 100, // +10% odpad
              jednotka: m.jednotka === 'm²' ? 'm²' : 'm',
              objednano: false,
              poznamka: 'Import PRO100 · spotřeba materiálu',
            })
          }
        }

        if (file.typ === 'elementy') {
          for (const el of file.elementy) {
            materialy.push({
              zakazka_id: zakazkaId,
              kategorie: 'kovani',
              nazev: el.nazev,
              pocet: el.pocet,
              jednotka: 'ks',
              objednano: false,
              poznamka: 'Import PRO100 · seznam prvků',
            })
          }
        }
      }

      if (materialy.length === 0) {
        toast.error('Žádné materiály k importu')
        return
      }

      const { error } = await supabase.from('materialy').insert(materialy)
      if (error) throw error

      setImported(true)
      toast.success(`Importováno ${materialy.length} položek!`)
      setTimeout(() => router.push(`/zakazky/${zakazkaId}`), 1500)
    } catch (err: any) {
      toast.error('Chyba při importu: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const celkemPolozek = parsedFiles.reduce((sum, f) =>
    sum + f.dilce.length + f.materialy.length + f.elementy.length, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/zakazky/${zakazkaId}`} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Zpět
        </Link>
        <h1 className="text-xl font-semibold text-oak-900">Import z PRO100</h1>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-4',
          dragOver
            ? 'border-oak-400 bg-oak-50'
            : 'border-birch-200 bg-white hover:border-oak-300'
        )}
      >
        <Upload className="w-8 h-8 text-mist-400 mx-auto mb-3" />
        <p className="font-medium text-oak-800 mb-1">Přetáhni soubory z PRO100</p>
        <p className="text-sm text-mist-500 mb-4">
          Nacenění (.___), Material consumption (.txt), Element list (.txt)
        </p>
        <label className="btn-secondary cursor-pointer">
          <FileText className="w-4 h-4" />
          Vybrat soubory
          <input
            type="file"
            multiple
            accept=".txt,.___,text/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {/* Nahrané soubory */}
      {parsedFiles.length > 0 && (
        <div className="space-y-3 mb-4">
          {parsedFiles.map(file => (
            <div key={file.nazevSouboru} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium text-oak-800 text-sm truncate max-w-xs">
                    {file.nazevSouboru}
                  </p>
                  <p className="text-xs text-mist-500 mt-0.5">
                    {file.typ === 'naceneni' && `Nacenění · ${file.dilce.length} dílců`}
                    {file.typ === 'material' && `Spotřeba materiálu · ${file.materialy.length} položek`}
                    {file.typ === 'elementy' && `Seznam prvků · ${file.elementy.length} položek`}
                    {file.typ === 'neznamy' && 'Neznámý formát'}
                  </p>
                </div>
                <button onClick={() => removeFile(file.nazevSouboru)} className="btn-ghost p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Náhled dat */}
              {file.typ === 'naceneni' && file.dilce.length > 0 && (
                <div className="bg-birch-50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-birch-200">
                        <th className="text-left px-3 py-2 text-mist-500 font-medium">Dílec</th>
                        <th className="text-right px-3 py-2 text-mist-500 font-medium">Š×V (mm)</th>
                        <th className="text-right px-3 py-2 text-mist-500 font-medium">Ks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {file.dilce.slice(0, 8).map((d, i) => (
                        <tr key={i} className="border-b border-birch-100 last:border-0">
                          <td className="px-3 py-1.5 text-oak-700 truncate max-w-[140px]">{d.nazev || '—'}</td>
                          <td className="px-3 py-1.5 text-right text-mist-600">{d.sirka}×{d.vyska}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{d.pocet}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {file.dilce.length > 8 && (
                    <p className="text-xs text-mist-400 px-3 py-2">
                      + {file.dilce.length - 8} dalších dílců
                    </p>
                  )}
                </div>
              )}

              {file.typ === 'material' && file.materialy.length > 0 && (
                <div className="bg-birch-50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-birch-200">
                        <th className="text-left px-3 py-2 text-mist-500 font-medium">Materiál</th>
                        <th className="text-right px-3 py-2 text-mist-500 font-medium">Množství</th>
                      </tr>
                    </thead>
                    <tbody>
                      {file.materialy.map((m, i) => (
                        <tr key={i} className="border-b border-birch-100 last:border-0">
                          <td className="px-3 py-1.5 text-oak-700 truncate max-w-[200px]">{m.material}</td>
                          <td className="px-3 py-1.5 text-right text-mist-600">{m.mnozstvi} {m.jednotka}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {file.typ === 'elementy' && file.elementy.length > 0 && (
                <div className="bg-birch-50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-birch-200">
                        <th className="text-left px-3 py-2 text-mist-500 font-medium">Prvek</th>
                        <th className="text-right px-3 py-2 text-mist-500 font-medium">Ks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {file.elementy.map((el, i) => (
                        <tr key={i} className="border-b border-birch-100 last:border-0">
                          <td className="px-3 py-1.5 text-oak-700">{el.nazev}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{el.pocet}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import tlačítko */}
      {celkemPolozek > 0 && !imported && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="btn-primary w-full justify-center py-3"
        >
          {importing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Importuji...</>
            : <><CheckCircle className="w-4 h-4" /> Importovat {celkemPolozek} položek do zakázky</>
          }
        </button>
      )}

      {imported && (
        <div className="card p-4 text-center">
          <CheckCircle className="w-8 h-8 text-oak-500 mx-auto mb-2" />
          <p className="font-medium text-oak-800">Import úspěšný!</p>
          <p className="text-sm text-mist-500">Přesměrovávám na zakázku…</p>
        </div>
      )}

      {/* Nápověda */}
      <div className="card p-4 mt-4">
        <p className="section-label mb-2">Jak exportovat z PRO100</p>
        <div className="space-y-2 text-sm text-mist-600">
          <p>1. Otevři projekt v PRO100</p>
          <p>2. Menu → <strong>Nacenění</strong> → vyber materiál → <strong>Exportovat</strong> (uloží .___)</p>
          <p>3. Menu → <strong>Sestavy</strong> → <strong>Spotřeba materiálu</strong> → uloží .txt</p>
          <p>4. Menu → <strong>Sestavy</strong> → <strong>Seznam prvků</strong> → uloží .txt</p>
          <p>5. Nahraj všechny soubory sem najednou</p>
        </div>
      </div>
    </div>
  )
}
