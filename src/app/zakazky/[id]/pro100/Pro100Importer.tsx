'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  zakazkaId: string
}

interface Dilec {
  nazev: string
  nazevPlny: string
  mat: string
  delka: number
  sirka: number
  tl: number
  hrana: string
  hranaL: string
  hranaP: string
  pocet: number
}

interface MatPolozka {
  nazev: string
  jednotka: string
  mnozstvi: number
  m2?: number
  je3mm?: boolean
}

interface Kovani {
  nazev: string
  pocet: number
}

interface ParsedResult {
  dilce: Dilec[]
  materialy: MatPolozka[]
  kovani: Kovani[]
  soubor: string
  typ: 'naceneni' | 'material' | 'elementy' | 'dilce' | 'neznamy'
}

// ─── Pomocné funkce (přeneseno z truhlarna ZIP) ────────────────────────────

function matKey(nazev: string): string {
  return nazev.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function matNazevKratky(nazevRaw: string): string {
  const parts = nazevRaw.replace(/\\\\_/g, '\\').replace(/\\\\/g, '\\').replace(/\\_/g, '\\').split('\\')
  const last = parts[parts.length - 1]?.trim()
  if (last && last.length > 2) return last
  for (let i = parts.length - 2; i >= 0; i--) {
    const p = parts[i].trim()
    if (p && p.length > 3 && !/^\d+mm$/.test(p)) return p
  }
  return last || nazevRaw
}
}

function parseFile(text: string, fileName: string): ParsedResult {
  const content = text.replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/).filter(l => l.trim())

  const tab8 = lines.filter(l => l.split('\t').length === 8)
  const tab2 = lines.filter(l => l.split('\t').length === 2 && /^\d+$/.test(l.split('\t')[1]?.trim()))
  const tab3m = lines.filter(l => l.split('\t').length === 3 && (l.includes('m²') || l.includes(' m')))
  const isHash = lines.length >= 2 && lines[0].includes('#') && /^[\d.]+\s+[\d.]+\s+\d+/.test(lines[1] || '')

  const dilce: Dilec[] = []
  const materialy: MatPolozka[] = []
  const kovani: Kovani[] = []

  if (isHash) {
    // === .### formát (nacenění) ===
    const header = lines[0]
    const tlMatch = header.match(/#(\d+)mm/)
    const tl = tlMatch ? parseInt(tlMatch[1]) : 18
    const je3mm = tl <= 5
    const hp = header.split('#')
    const nazevParts = hp.map(p => p.trim()).filter(p => p && !/^\d+mm$/.test(p) && p.length > 3)
    const matNazev = nazevParts[nazevParts.length - 1] || 'Materiál'

    let m2celkem = 0
    lines.slice(1).forEach(line => {
      const m = line.match(/^([\d.]+)\s+([\d.]+)\s+(\d+)/)
      if (!m) return
      const s = Math.round(parseFloat(m[1]) * 10)
      const d = Math.round(parseFloat(m[2]) * 10)
      const k = parseInt(m[3])
      const nasobek = tl >= 30 ? 2 : 1
      m2celkem += s * d / 1e6 * k * nasobek

      const restMatch = line.match(/^[\d.]+\s+[\d.]+\s+\d+\s+\d+\s+\d+\s+\d+\s+(.+)/)
      const rest = restMatch ? restMatch[1] : ''
      const rparts = rest.split('#')
      let nazevD = 'Dílec'
      for (let pi = 0; pi < rparts.length; pi++) {
        if (rparts[pi].match(/^\d+mm\s*$/)) break
        if (pi > 0) nazevD = rparts[pi].trim()
      }
      dilce.push({ nazev: nazevD || 'Dílec', nazevPlny: nazevD, mat: matNazev, delka: d, sirka: s, tl, hrana: '—', hranaL: '', hranaP: '', pocet: k })
    })

    // Přidej jako materiálovou položku
    const deskW = 2800, deskH = 2080, okraj = 14
    const pouzM2 = (deskW - 2 * okraj) * (deskH - 2 * okraj) / 1e6
    const desek = Math.ceil(m2celkem / pouzM2 * 1.1)
    materialy.push({
      nazev: matNazev,
      jednotka: je3mm ? 'ks HDF desek' : 'ks desek',
      mnozstvi: desek,
      m2: Math.round(m2celkem * 100) / 100,
      je3mm,
    })

    return { dilce, materialy, kovani, soubor: fileName, typ: 'naceneni' }

  } else if (tab3m.length >= 3) {
    // === Material consumption ===
    const byMat: Record<string, { nazev: string; m2: number; bm: number }> = {}
    lines.forEach(line => {
      const cols = line.split('\t'); if (cols.length !== 3) return
      const nazevRaw = cols[0].trim().replace(/\\\\_/g, '\\').replace(/\\\\/g, '\\').replace(/\\_/g, '\\')
      const mnozstvi = parseFloat(cols[1].replace(',', '.')) || 0
      const jednotka = cols[2].trim()
      const kratkyNazev = matNazevKratky(nazevRaw)
      const mk = matKey(kratkyNazev)
      if (!byMat[mk]) byMat[mk] = { nazev: kratkyNazev, m2: 0, bm: 0 }
      if (jednotka === 'm²') byMat[mk].m2 = mnozstvi
      else if (jednotka === 'm') byMat[mk].bm = mnozstvi
    })

    const deskW = 2800, deskH = 2080
    const deskM2 = deskW * deskH / 1e6

    Object.values(byMat).filter(d => d.m2 > 0).forEach(d => {
      const desek = Math.ceil(d.m2 / deskM2 * 1.05)
      materialy.push({ nazev: d.nazev, jednotka: 'ks desek', mnozstvi: desek, m2: d.m2 })
    })

    const celkemBm = Object.values(byMat).reduce((s, d) => s + d.bm, 0)
    if (celkemBm > 0) {
      materialy.push({ nazev: 'Hranovací páska', jednotka: 'bm', mnozstvi: Math.round(celkemBm * 10) / 10 })
    }

    return { dilce, materialy, kovani, soubor: fileName, typ: 'material' }

  } else if (tab2.length >= 3) {
    // === Element list (kování) ===
    lines.forEach(line => {
      const cols = line.split('\t'); if (cols.length !== 2) return
      const nazev = cols[0].trim(), pocet = parseInt(cols[1]) || 1
      if (!nazev || !pocet) return
      kovani.push({ nazev, pocet })
    })
    return { dilce, materialy, kovani, soubor: fileName, typ: 'elementy' }

  } else if (tab8.length > 3) {
    // === Piece list (dílce) ===
    const skipMat = ['dětské', 'modrá', 'vibelenii']
    const skipNazev = ['obrzeże', 'poduszka', 'čalounění', 'lamela']
    const byMatPl: Record<string, { nazev: string; m2: number; je3mm: boolean }> = {}

    lines.forEach(line => {
      if (!line.trim()) return
      const cols = line.split('\t'); if (cols.length !== 8) return
      const [nR, dR, hLR, sR, hPR, tlR, pR, mR] = cols
      const delka = parseInt(dR) || 0, sirka = parseInt(sR) || 0; if (!delka || !sirka) return
      const tl = parseInt(tlR) || 18, pocet = parseInt(pR) || 1
      const hL = hLR.trim() === '' ? 0 : 1, hP = hPR.trim() === '' ? 0 : 1
      const ph = hL + hP
      let hrana = '—'
      if (ph === 1) hrana = 'ABS 1 – 1 hrana'
      else if (ph === 2) hrana = 'ABS 1 – 2 hrany'
      else if (ph >= 3) hrana = 'ABS 1 – ' + ph + ' hrany'
      const nazevPlny = nR.trim()
      const nazev = nazevPlny.includes('.') ? nazevPlny.split('.').pop()! : nazevPlny || 'Dílec'
      const matFull = mR.trim()
      const matKratky = matNazevKratky(matFull)
      const mat = matKratky || 'Materiál'
      dilce.push({ nazev, nazevPlny, mat, delka, sirka, tl, hrana, hranaL: hLR.trim(), hranaP: hPR.trim(), pocet })

      const nazevL = nazev.toLowerCase(), matL = matFull.toLowerCase()
      if (tl > 1 && matFull && !skipMat.some(s => matL.includes(s)) && !skipNazev.some(s => nazevL.includes(s))) {
        const je3mm = tl <= 5
        const mk = matKey(matKratky) + (je3mm ? '_3mm' : '')
        const nazevPolozky = je3mm ? matKratky + ' (HDF 3mm)' : matKratky
        if (!byMatPl[mk]) byMatPl[mk] = { nazev: nazevPolozky, m2: 0, je3mm }
        const nasobek = tl >= 30 ? 2 : 1
        byMatPl[mk].m2 += delka * sirka / 1e6 * pocet * nasobek
      }
    })

    // Spočítej hrany
    let celkemHranBm = 0
    lines.forEach(line => {
      const cols = line.split('\t'); if (cols.length !== 8) return
      const [nR, dR, hLR, sR, hPR, tlR, pR] = cols
      try {
        const delka = parseInt(dR), sirka = parseInt(sR), tl = parseInt(tlR), pocet = parseInt(pR)
        if (tl <= 1 || !delka || !sirka) return
        if ((nR || '').includes('Obr')) return
        const hL = hLR.trim() === '' ? 0 : 1, hP = hPR.trim() === '' ? 0 : 1
        if (!hL && !hP) return
        const bmL = delka / 1000 * (hLR.trim() === '=' ? 2 : 1) * (hL ? 1 : 0)
        const bmP = sirka / 1000 * (hPR.trim() === '=' ? 2 : 1) * (hP ? 1 : 0)
        celkemHranBm += (bmL + bmP) * pocet
      } catch (e) { /* skip */ }
    })

    const deskW = 2800, deskH = 2080
    const deskM2 = deskW * deskH / 1e6
    Object.values(byMatPl).forEach(d => {
      const desek = Math.ceil(d.m2 / deskM2 * 1.1)
      materialy.push({ nazev: d.nazev, jednotka: d.je3mm ? 'ks HDF desek' : 'ks desek', mnozstvi: desek, m2: Math.round(d.m2 * 100) / 100, je3mm: d.je3mm })
    })
    if (celkemHranBm > 0) {
      materialy.push({ nazev: 'Hranovací páska', jednotka: 'bm', mnozstvi: Math.round(celkemHranBm * 10) / 10 })
    }

    return { dilce, materialy, kovani, soubor: fileName, typ: 'dilce' }
  }

  return { dilce, materialy, kovani, soubor: fileName, typ: 'neznamy' }
}

// ─── Komponenta ────────────────────────────────────────────────────────────

export function Pro100Importer({ zakazkaId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [parsedResults, setParsedResults] = useState<ParsedResult[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const results: ParsedResult[] = []
    let processed = 0

    fileArray.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string
        const result = parseFile(text, file.name)
        results.push(result)
        processed++
        if (processed === fileArray.length) {
          setParsedResults(prev => [...prev, ...results])
        }
      }
      reader.readAsText(file, 'windows-1250')
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
  }, [processFiles])

  const totalDilce = parsedResults.reduce((s, r) => s + r.dilce.length, 0)
  const totalMat = parsedResults.reduce((s, r) => s + r.materialy.length, 0)
  const totalKovani = parsedResults.reduce((s, r) => s + r.kovani.length, 0)

  const handleImport = async () => {
    setImporting(true)
    try {
      // Uložit materiály
      for (const result of parsedResults) {
        for (const mat of result.materialy) {
          await supabase.from('materialy').insert({
            zakazka_id: zakazkaId,
            kategorie: mat.je3mm ? 'dvírka' : mat.jednotka === 'bm' ? 'hrany' : 'korpus',
            nazev: mat.nazev,
            pocet: mat.mnozstvi,
            jednotka: mat.jednotka,
            objednano: false,
            poznamka: mat.m2 ? `${mat.m2} m²` : null,
          })
        }

        // Uložit kování
        for (const kov of result.kovani) {
          await supabase.from('materialy').insert({
            zakazka_id: zakazkaId,
            kategorie: 'kovani',
            nazev: kov.nazev,
            pocet: kov.pocet,
            jednotka: 'ks',
            objednano: false,
          })
        }
      }

      setImported(true)
      setTimeout(() => router.push(`/zakazky/${zakazkaId}`), 1500)
    } catch (err) {
      console.error(err)
      alert('Chyba při importu. Zkuste to znovu.')
    } finally {
      setImporting(false)
    }
  }

  if (imported) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800">Import dokončen!</h2>
          <p className="text-gray-500 mt-1">Přesměrování na zakázku...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push(`/zakazky/${zakazkaId}`)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Zpět
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">📥 PRO100 Import</h1>
            <p className="text-sm text-gray-500">Nahraj soubory z PRO100 — nacenění (.###), spotřeba materiálu nebo seznam dílců</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Drop zona */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50'
          }`}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-700 font-medium mb-1">Přetáhni soubory sem</p>
          <p className="text-sm text-gray-400 mb-4">nebo klikni pro výběr</p>
          <label className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors">
            Vybrat soubory
            <input
              type="file"
              multiple
              accept=".###,.txt,.*"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
          <p className="text-xs text-gray-400 mt-4">Podporované formáty: .### (nacenění) · .txt (spotřeba materiálu, seznam dílců)</p>
        </div>

        {/* Náhled výsledků */}
        {parsedResults.length > 0 && (
          <>
            {/* Souhrn */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalDilce}</div>
                <div className="text-sm text-gray-500 mt-1">Dílců</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalMat}</div>
                <div className="text-sm text-gray-500 mt-1">Materiálů</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalKovani}</div>
                <div className="text-sm text-gray-500 mt-1">Kování</div>
              </div>
            </div>

            {/* Detail souborů */}
            {parsedResults.map((result, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-800">{result.soubor}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {result.typ === 'naceneni' && '📋 Nacenění (formát .###)'}
                      {result.typ === 'material' && '🪵 Spotřeba materiálu'}
                      {result.typ === 'elementy' && '🔩 Seznam kování'}
                      {result.typ === 'dilce' && '📐 Dílce (piece list)'}
                      {result.typ === 'neznamy' && '❓ Neznámý formát'}
                    </p>
                  </div>
                  <button
                    onClick={() => setParsedResults(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xl"
                  >
                    ×
                  </button>
                </div>

                {result.materialy.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Materiál</p>
                    <div className="space-y-1">
                      {result.materialy.map((m, j) => (
                        <div key={j} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-sm text-gray-700">{m.nazev}</span>
                          <span className="text-sm font-medium text-gray-900">{m.mnozstvi} {m.jednotka}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.dilce.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dílce ({result.dilce.length} ks)</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {result.dilce.slice(0, 10).map((d, j) => (
                        <div key={j} className="flex justify-between items-center py-1 text-sm border-b border-gray-50 last:border-0">
                          <span className="text-gray-700">{d.nazev} × {d.pocet}</span>
                          <span className="text-gray-400">{d.delka} × {d.sirka} / {d.tl}mm</span>
                        </div>
                      ))}
                      {result.dilce.length > 10 && (
                        <p className="text-xs text-gray-400 py-1">… a {result.dilce.length - 10} dalších</p>
                      )}
                    </div>
                  </div>
                )}

                {result.kovani.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Kování ({result.kovani.length} položek)</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.kovani.slice(0, 8).map((k, j) => (
                        <div key={j} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-700">{k.nazev}</span>
                          <span className="text-gray-900 font-medium">{k.pocet} ks</span>
                        </div>
                      ))}
                      {result.kovani.length > 8 && (
                        <p className="text-xs text-gray-400 py-1">… a {result.kovani.length - 8} dalších</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Import tlačítko */}
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Importuji...' : `✓ Importovat do zakázky (${totalMat + totalKovani} položek)`}
              </button>
              <button
                onClick={() => setParsedResults([])}
                className="px-4 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Zrušit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
