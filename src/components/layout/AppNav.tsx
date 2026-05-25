'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Inbox, Hammer, Calculator,
  Settings, Trees
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/zakazky',    icon: Inbox,            label: 'Zakázky' },
  { href: '/vyroba',     icon: Hammer,           label: 'Výroba' },
  { href: '/kalkulace',  icon: Calculator,       label: 'Kalkulace' },
  { href: '/nastaveni',  icon: Settings,         label: 'Nastavení' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      <header className="hidden md:flex items-center border-b border-birch-200 bg-white px-6 h-14 sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-8">
          <div className="w-7 h-7 bg-oak-500 rounded-lg flex items-center justify-center">
            <Trees className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-oak-800 text-[15px] tracking-tight">
            MistyOak
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-colors',
                  active
                    ? 'bg-oak-50 text-oak-700 font-medium'
                    : 'text-mist-500 hover:text-oak-700 hover:bg-birch-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-oak-100 rounded-full flex items-center justify-center text-xs font-medium text-oak-700">
            MO
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-birch-200 flex safe-area-pb">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors',
                active ? 'text-oak-600' : 'text-mist-400'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5px]')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
