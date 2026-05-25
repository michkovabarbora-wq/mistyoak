export default function NastaveniPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <h1 className="text-xl font-semibold text-oak-900 mb-6">Nastavení</h1>

      <div className="space-y-3">
        <div className="card p-4">
          <h2 className="font-medium text-oak-800 mb-1">Firma</h2>
          <p className="text-sm text-mist-500">Název, IČO, adresa, logo</p>
        </div>
        <div className="card p-4">
          <h2 className="font-medium text-oak-800 mb-1">Dodavatelé</h2>
          <p className="text-sm text-mist-500">Egger, Blum, Grass a další</p>
        </div>
        <div className="card p-4">
          <h2 className="font-medium text-oak-800 mb-1">Import PRO100</h2>
          <p className="text-sm text-mist-500">Nastavení mapování CSV/XLS sloupců</p>
        </div>
        <div className="card p-4">
          <h2 className="font-medium text-oak-800 mb-1">Notifikace</h2>
          <p className="text-sm text-mist-500">Upozornění na termíny a chybějící materiál</p>
        </div>
      </div>
    </div>
  )
}
