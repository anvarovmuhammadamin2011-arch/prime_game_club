'use client'

import { useApp } from '@/context/app-context'
import { Card, PageHeader, Button, Badge } from '@/components/ui/primitives'
import { formatSom } from '@/lib/format'
import { useState } from 'react'
import { Check, X, Clock, Calendar, Monitor } from 'lucide-react'
import type { Booking } from '@/lib/types'

const FILTERS = [
  { id: 'all', labelKey: 'all' },
  { id: 'pending', labelKey: 'pending' },
  { id: 'confirmed', labelKey: 'confirmed' },
  { id: 'rejected', labelKey: 'rejected' },
]

const STATUS_TONE: Record<Booking['status'], 'info' | 'success' | 'danger' | 'default'> = {
  pending: 'info',
  confirmed: 'success',
  rejected: 'danger',
  completed: 'default',
}

export default function BookingsPage() {
  const { t, bookings, confirmBooking, rejectBooking } = useApp()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const filtered = bookings.filter((b) => {
    const statusOk = filter === 'all' || b.status === filter
    if (!statusOk) return false
    if (!needle) return true
    return `${b.code || ''} ${b.userName} ${b.phone || ''} ${b.computerLabel}`
      .toLowerCase()
      .includes(needle)
  })

  return (
    <div>
      <PageHeader
        title={t('bookingManagement')}
        subtitle={t('approveReject')}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? bookings.length
              : bookings.filter((b) => b.status === f.id).length
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(f.labelKey)}
              <span className="text-mono-num text-xs opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kod, ism yoki telefon bo‘yicha qidirish..."
        className="mb-4 h-10 w-full rounded-lg border border-input bg-background px-4 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {t('noBookings')}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.userName}</p>
                  <p className="text-mono-num mt-0.5 text-sm font-semibold text-primary">
                    Kod: {b.code || '—'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3.5 w-3.5" />
                      {b.computerLabel}
                      {b.seats && b.seats > 1 ? ` · ${b.seats} o‘rin` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {b.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {b.startTime} · {b.hours}h
                    </span>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{t(b.status)}</Badge>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="text-xs text-muted-foreground">
                  {t('payment')}: <span className="uppercase">{b.paymentMethod}</span>
                </div>
                <span className="text-mono-num font-semibold">
                  {formatSom(b.total)}
                </span>
              </div>

              {b.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-1"
                    onClick={() => confirmBooking(b.id)}
                  >
                    <Check className="h-4 w-4" />
                    {t('confirm')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => rejectBooking(b.id)}
                  >
                    <X className="h-4 w-4" />
                    {t('reject')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
