'use client'

import { useApp } from '@/context/app-context'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import type { Role, Lang } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Notifications } from '@/components/notifications'

import {
  Home,
  Map,
  CalendarPlus,
  User as UserIcon,
  LayoutDashboard,
  MonitorSmartphone,
  Coffee,
  ClipboardCheck,
  Users,
  Tag,
  DollarSign,
  Sun,
  Moon,
  LogOut,
  Gamepad2,
  Languages,
} from 'lucide-react'

interface NavItem {
  href: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
}

const NAV: Record<Role, NavItem[]> = {
  user: [
    { href: '/home', labelKey: 'home', icon: Home },
    { href: '/map', labelKey: 'map', icon: Map },
    { href: '/book', labelKey: 'book', icon: CalendarPlus },
    { href: '/profile', labelKey: 'profile', icon: UserIcon },
  ],
  admin: [
    { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
    { href: '/admin/computers', labelKey: 'computers', icon: MonitorSmartphone },
    { href: '/admin/bar', labelKey: 'bar', icon: Coffee },
    { href: '/admin/bookings', labelKey: 'bookings', icon: ClipboardCheck, badge: true },
  ],
  superadmin: [
    { href: '/superadmin', labelKey: 'dashboard', icon: LayoutDashboard },
    { href: '/superadmin/finance', labelKey: 'finance', icon: DollarSign },
    { href: '/superadmin/staff', labelKey: 'staff', icon: Users },
    { href: '/superadmin/promotions', labelKey: 'promotions', icon: Tag },
    { href: '/superadmin/pricing', labelKey: 'pricing', icon: DollarSign },
  ],
}

const LANGS: Lang[] = ['uz', 'ru', 'en']

export function AppShell({
  children,
  role,
}: {
  children: React.ReactNode
  role: Role
}) {
  const {
    currentUser,
    hydrated,
    logout,
    t,
    theme,
    toggleTheme,
    language,
    setLanguage,
    pendingCount,
  } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (hydrated && (!currentUser || currentUser.role !== role)) {
      router.replace('/')
    }
  }, [hydrated, currentUser, role, router])

  if (!hydrated || !currentUser || currentUser.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Gamepad2 className="h-6 w-6 animate-pulse text-primary" />
      </div>
    )
  }

  const items = NAV[role]

  const cycleLang = () => {
    const idx = LANGS.indexOf(language)
    setLanguage(LANGS[(idx + 1) % LANGS.length])
  }

  return (
    <div className="min-h-screen">
      <Notifications />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link href={items[0].href} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Gamepad2 className="h-5 w-5" />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight">
                Prime Game Club
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== items[0].href && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                  {item.badge && pendingCount > 0 && (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5">

            <button
              onClick={cycleLang}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Language"
            >
              <Languages className="h-4 w-4" />
              <span className="uppercase">{language}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => {
                logout()
                router.replace('/')
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-8">
        {children}
      </main>

      {/* Mobile/Telegram Mini App: pastki navigatsiya paneli */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-6xl items-stretch px-1">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== items[0].href && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {active && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && pendingCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
                      {pendingCount}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
