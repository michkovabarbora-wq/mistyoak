// ─── Enums ────────────────────────────────────────────────────────────────────

export type StavZakazky =
  | 'poptavka'
  | 'zamereni'
  | 'navrh'
  | 'naceneni'
  | 'schvaleno'
  | 'vyroba'
  | 'montaz'
  | 'hotovo'
  | 'storno'

export type PrioritaZakazky = 'nizka' | 'normal' | 'vysoka' | 'urgent'

export type TypZakazky =
  | 'kuchyne'
  | 'satna'
  | 'obyvak'
  | 'koupelna'
  | 'loznice'
  | 'pracovna'
  | 'jine'

export type ZdrojPoptavky =
  | 'doporuceni'
  | 'instagram'
  | 'facebook'
  | 'web'
  | 'telefon'
  | 'jine'

export type FazeVyroby =
  | 'pripraven'
  | 'objednan_material'
  | 'rezani'
  | 'olepovani'
  | 'cnc_vrtani'
  | 'kompletace'
  | 'pripraveno_k_montazi'
  | 'hotovo'

// ─── Zákazník ─────────────────────────────────────────────────────────────────

export interface Zakaznik {
  id: string
  created_at: string
  jmeno: string
  telefon: string | null
  email: string | null
  adresa: string | null
  poznamka: string | null
}

// ─── Zakázka ──────────────────────────────────────────────────────────────────

export interface Zakazka {
  id: string
  created_at: string
  updated_at: string
  cislo: string                   // ZAK-2025-047
  zakaznik_id: string
  zakaznik?: Zakaznik
  typ: TypZakazky
  stav: StavZakazky
  priorita: PrioritaZakazky
  zdroj: ZdrojPoptavky | null
  termin: string | null           // ISO date string
  adresa_montaze: string | null
  poznamka: string | null
  // Kalkulace (denormalizovaná pro rychlý přehled)
  cena_zakaznik: number | null
  naklady_celkem: number | null
  zisk: number | null
  // Výroba
  faze_vyroby: FazeVyroby | null
}

// ─── Fáze zakázky ─────────────────────────────────────────────────────────────

export interface FazeZakazky {
  id: string
  zakazka_id: string
  typ: StavZakazky
  stav: 'ceka' | 'probíha' | 'hotovo'
  datum_zahajeni: string | null
  datum_dokonceni: string | null
  poznamky: string | null
  prilohy: string[]               // URL pole
}

// ─── Materiál ─────────────────────────────────────────────────────────────────

export type KategorieMaterialu =
  | 'korpus'
  | 'dvírka'
  | 'pracovni_deska'
  | 'hrany'
  | 'kovani'
  | 'spotrebice'
  | 'jine'

export interface Material {
  id: string
  zakazka_id: string
  kategorie: KategorieMaterialu
  nazev: string
  dodavatel: string | null
  cena_ks: number | null
  pocet: number
  jednotka: string                // 'ks', 'm', 'm²', 'bm'
  objednano: boolean
  poznamka: string | null
}

// ─── Kalkulace ────────────────────────────────────────────────────────────────

export interface KalkulacePolozka {
  id: string
  typ: 'material' | 'kovani' | 'pracovni_deska' | 'prace' | 'montaz' | 'doprava' | 'jine'
  nazev: string
  castka: number
}

export interface Kalkulace {
  id: string
  zakazka_id: string
  polozky: KalkulacePolozka[]
  marze_procent: number
  sleva: number
  dph_procent: number
  // Vypočtené hodnoty (uložené pro historii)
  naklady_celkem: number
  cena_bez_dph: number
  cena_s_dph: number
  zisk: number
  updated_at: string
}

// ─── Dokument / příloha ───────────────────────────────────────────────────────

export type TypDokumentu =
  | 'vizualizace'
  | 'pro100'
  | 'foto_zamereni'
  | 'foto_montaz'
  | 'pdf_navrh'
  | 'jine'

export interface Dokument {
  id: string
  zakazka_id: string
  typ: TypDokumentu
  nazev: string
  url: string
  verze: number
  je_finalni: boolean
  created_at: string
}

// ─── Úkol ─────────────────────────────────────────────────────────────────────

export interface Ukol {
  id: string
  zakazka_id: string | null       // null = globální úkol
  text: string
  splneno: boolean
  datum: string | null
  priorita: PrioritaZakazky
  created_at: string
}

// ─── Komunikace / log ─────────────────────────────────────────────────────────

export interface KomunikaceZaznam {
  id: string
  zakazka_id: string
  typ: 'telefon' | 'email' | 'sms' | 'osobne' | 'poznamka'
  obsah: string
  created_at: string
  autor: string | null
}

// ─── Dashboard typy ───────────────────────────────────────────────────────────

export interface DashboardData {
  hori: Zakazka[]
  blizkeMontaze: Zakazka[]
  cekajiciAkci: Zakazka[]
  chybejiciMaterial: Material[]
  dnesniUkoly: Ukol[]
  aktivniZakazky: number
  poptavkyCekaji: number
  terminuTyden: number
}

// ─── Utility typy ─────────────────────────────────────────────────────────────

export type WithZakaznik<T> = T & { zakaznik: Zakaznik }

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
