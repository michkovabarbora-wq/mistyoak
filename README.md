# MistyOak — Systém pro správu zakázkové výroby nábytku

Minimalistický webový systém pro truhláře a malé týmy. Žádný ERP chaos — jen přehled zakázek, výroba a termíny na jednom místě.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** (PostgreSQL, Auth, Storage, real-time)
- **Tailwind CSS** (přírodní paleta inspirovaná dřevem)
- **TypeScript** (plně typovaný)
- **Lucide React** (ikony)

## Rychlý start

### 1. Naklonuj projekt

```bash
git clone <repo>
cd mistyoak
npm install
```

### 2. Vytvoř Supabase projekt

1. Jdi na [supabase.com](https://supabase.com) a vytvoř nový projekt
2. V SQL editoru spusť celý soubor `supabase/schema.sql`
3. Zkopíruj URL a anon klíč z **Settings → API**

### 3. Nastav prostředí

```bash
cp .env.local.example .env.local
```

Vyplň do `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://tvuj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvuj-anon-key
```

### 4. Spusť vývojový server

```bash
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000)

## Struktura projektu

```
src/
├── app/
│   ├── dashboard/          # Hlavní přehled (co hoří, termíny, úkoly)
│   ├── zakázky/            # Seznam + detail zakázky
│   │   └── [id]/           # Detail s tabsy (přehled, materiály, kal...)
│   ├── výroba/             # Kanban board výrobních fází
│   ├── kalkulace/          # Přehled kalkulací
│   └── nastavení/          # Konfigurace (firma, dodavatelé, PRO100)
├── components/
│   ├── ui/                 # Sdílené komponenty (Badge, Card, StepRail...)
│   ├── layout/             # AppNav (top bar + mobile bottom nav)
│   └── zakázky/            # ZakazkaCard
├── lib/
│   ├── supabase/           # Client + Server Supabase klienti
│   └── utils.ts            # cn(), formatCena(), stavProgress()...
└── types/
    └── index.ts            # Všechny TypeScript typy
```

## Workflow zakázky

```
Poptávka → Zaměření → Návrh → Nacenění → Schváleno
                                              ↓
Montáž ← Připraveno k montáži ← Kompletace ← Výroba
  ↓
Hotovo + Faktura
```

## Další kroky (roadmap)

- [ ] Formulář pro novou zakázku
- [ ] Formulář pro nového zákazníka  
- [ ] Kalkulační editor s živým přepočtem
- [ ] PRO100 CSV/XLS importér
- [ ] Nahrávání fotek a dokumentů (Supabase Storage)
- [ ] Montážní checklist
- [ ] Notifikace – upozornění na blížící se termíny
- [ ] Offline podpora (PWA)
- [ ] Export PDF nabídky pro zákazníka

## Nasazení (Vercel)

```bash
npm run build   # ověř build
```

1. Push na GitHub
2. Připoj repo na [vercel.com](https://vercel.com)
3. Přidej env proměnné v Vercel dashboardu
4. Deploy 🚀
