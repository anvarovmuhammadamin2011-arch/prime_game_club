'use client'

import { useApp } from '@/context/app-context'
import Link from 'next/link'
import { Card, Button, Badge, StatCard, PageHeader } from '@/components/ui/primitives'
import { COMPUTER_TYPES } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import { formatSom } from '@/lib/format'
import { phoneKey } from '@/lib/phone'
import {
  Clock,
  CalendarPlus,
  Map as MapIcon,
  ArrowRight,
  Cpu,
  Gift,
} from 'lucide-react'

const BAR_NAME_KEYS: Record<string, string> = {
  'Suv 0.5L': 'extraWater',
  'Pepsi 0.5L': 'extraPepsi',
  'Red Bull': 'extraRedBull',
  Sendvich: 'extraSandwich',
}

export default function HomePage() {
  const { currentUser, computers, bookings, barProducts, t } = useApp()
  if (!currentUser) return null

  const available = computers.filter((c) => c.status === 'available').length
  const types = Object.values(COMPUTER_TYPES).filter((type) =>
    computers.some((c) => c.type === type.id),
  )
  const myBookings = bookings.filter(
    (b) =>
      (b.phone ? phoneKey(b.phone) === phoneKey(currentUser.phone) : b.userId === currentUser.id) &&
      b.status !== 'rejected',
  )
  const favorites = computers.filter((c) =>
    currentUser.favorites.includes(c.id),
  )

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Card className="overflow-hidden border-none bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-primary-foreground/70">
              {t('welcome')},
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">
              {currentUser.name}
            </h1>
            <p className="mt-2 max-w-md text-sm text-primary-foreground/80 text-pretty">
              {t('heroAvailable', { n: available })}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/map">
              <Button variant="gold" size="lg">
                <CalendarPlus className="h-5 w-5" />
                {t('bookNow')}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
        <StatCard
          label={t('hoursPlayed')}
          value={`${currentUser.hoursPlayed}`}
          hint={t('total')}
          icon={<Clock className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label={t('available')}
          value={`${available}`}
          hint={t('ofTotal', { n: computers.length })}
          icon={<Cpu className="h-5 w-5" />}
          tone="success"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/map">
          <Card className="group flex h-full items-center gap-4 p-5 transition-colors hover:border-primary/40 hover:bg-accent">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <MapIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('interactiveMap')}</p>
              <p className="text-sm text-muted-foreground">{t('interactiveMapDesc')}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
        <Link href="/profile">
          <Card className="group flex h-full items-center gap-4 p-5 transition-colors hover:border-primary/40 hover:bg-accent">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Gift className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('loyaltyProgram')}</p>
              <p className="text-sm text-muted-foreground">{t('loyaltyDesc')}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      </div>

      {/* Pricing tiers */}
      <div>
        <PageHeader title={t('pricing')} subtitle={t('hourlyRates')} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {types.map((type) => (
            <Card key={type.id} className="flex flex-col p-5">
              <p className="font-heading text-lg font-bold">{type.name}</p>
              <p className="mt-1 text-mono-num text-2xl font-bold text-primary">
                {formatSom(type.pricePerHour)}
              </p>
              <p className="text-xs text-muted-foreground">{t('som')} {t('perHour')}</p>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <p>{type.gpu}</p>
                <p>{type.ram}</p>
                <p>{type.display}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bar prices */}
      {barProducts.length > 0 && (
        <div>
          <PageHeader title={t('barPrices')} subtitle={t('barPricesSubtitle')} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {barProducts.map((product) => (
              <Card
                key={product.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <span className="text-sm font-medium">
                  {t(BAR_NAME_KEYS[product.name] ?? product.name)}
                </span>
                <span className="text-mono-num text-sm font-semibold text-primary">
                  {formatSom(product.price)}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Favorites + my bookings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <PageHeader title={t('favorites')} subtitle={t('favoritesSubtitle')} />
          {favorites.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              {t('noFavorites')}
            </Card>
          ) : (
            <div className="space-y-3">
              {favorites.map((c) => {
                const meta = STATUS_META[c.status]
                return (
                  <Card key={c.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                      <div>
                        <p className="text-mono-num font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {COMPUTER_TYPES[c.type].name}
                        </p>
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{t(meta.labelKey)}</Badge>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <PageHeader title={t('myBookings')} subtitle={t('recentActivity')} />
          {myBookings.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              {t('noBookingsYet')}
            </Card>
          ) : (
            <div className="space-y-3">
              {myBookings.slice(0, 4).map((b) => (
                <Card key={b.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-mono-num font-medium">{b.computerLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.code ? `${t('codeLabel')}: ${b.code} · ` : ''}
                      {t('bookingMeta', {
                        date: b.date,
                        time: b.startTime,
                        hours: b.hours,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-mono-num text-sm font-semibold">
                      {formatSom(b.total)}
                    </p>
                    <Badge
                      tone={
                        b.status === 'confirmed'
                          ? 'success'
                          : b.status === 'pending'
                            ? 'info'
                            : 'default'
                      }
                      className="mt-1"
                    >
                      {b.status === 'confirmed'
                        ? t('confirmed')
                        : b.status === 'pending'
                          ? t('pending')
                          : b.status === 'rejected'
                            ? t('rejected')
                            : t('completed')}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
