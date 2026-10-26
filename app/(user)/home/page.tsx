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

export default function HomePage() {
  const { currentUser, computers, bookings, t } = useApp()
  if (!currentUser) return null

  const available = computers.filter((c) => c.status === 'available').length
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
              Hozir {available} ta ish stansiyasi bo'sh. O'rningizni band qiling
              va o'yinga sho'ng'ing.
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
          label="O'ynalgan soat"
          value={`${currentUser.hoursPlayed}`}
          hint="jami"
          icon={<Clock className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Bo'sh kompyuter"
          value={`${available}`}
          hint={`${computers.length} dan`}
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
              <p className="font-medium">Interaktiv xarita</p>
              <p className="text-sm text-muted-foreground">Zal joylashuvini ko'ring</p>
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
              <p className="font-medium">Sodiqlik dasturi</p>
              <p className="text-sm text-muted-foreground">Ballarni almashtiring</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      </div>

      {/* Pricing tiers */}
      <div>
        <PageHeader title="Narxlar" subtitle="Soatlik tariflar" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(COMPUTER_TYPES).map((type) => (
            <Card key={type.id} className="flex flex-col p-5">
              <p className="font-heading text-lg font-bold">{type.name}</p>
              <p className="mt-1 text-mono-num text-2xl font-bold text-primary">
                {formatSom(type.pricePerHour)}
              </p>
              <p className="text-xs text-muted-foreground">{t('som')} / soat</p>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <p>{type.gpu}</p>
                <p>{type.ram}</p>
                <p>{type.display}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Favorites + my bookings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <PageHeader title="Sevimlilar" subtitle="Tezkor bron uchun" />
          {favorites.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Hali sevimli kompyuter yo'q. Xaritadan yulduzcha bosib qo'shing.
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
          <PageHeader title="Mening bronlarim" subtitle="So'nggi faollik" />
          {myBookings.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Hali bron qilmadingiz.
            </Card>
          ) : (
            <div className="space-y-3">
              {myBookings.slice(0, 4).map((b) => (
                <Card key={b.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-mono-num font-medium">{b.computerLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.code ? `Kod: ${b.code} · ` : ''}
                      {b.date} · {b.startTime} · {b.hours} soat
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
                        ? 'Tasdiqlangan'
                        : b.status === 'pending'
                          ? t('pending')
                          : 'Yakunlangan'}
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
