'use client'

import { useEffect, useState } from 'react'
import { Badge, Button } from '@/components/ui/primitives'
import { COMPUTER_TYPES, EXTRAS } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import { formatSom } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/app-context'
import { Check, Star, X } from 'lucide-react'
import type { Computer } from '@/lib/types'

const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
const HOURS = [1, 2, 3, 4, 6, 8]
const EXTRA_NAME_KEYS: Record<string, string> = {
  water: 'extraWater',
  pepsi: 'extraPepsi',
  redbull: 'extraRedBull',
  sandwich: 'extraSandwich',
}

/**
 * Xaritada kompyuter tanlanganda ochiladigan oyna:
 * avval bron qilinadi, keyin qo'shimcha xizmatlar taklif qilinadi.
 */
export function PcModal({ pc, onClose }: { pc: Computer; onClose: () => void }) {
  const { currentUser, createBooking, refreshBookings, toggleFavorite, t } = useApp()
  const info = COMPUTER_TYPES[pc.type]
  const status = STATUS_META[pc.status]
  const available = pc.status === 'available'

  const [step, setStep] = useState<'form' | 'extras' | 'done'>('form')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('18:00')
  const [hours, setHours] = useState(2)
  const [extras, setExtras] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState(5)

  const baseTotal = info.pricePerHour * hours
  const extrasTotal = extras.reduce(
    (sum, id) => sum + (EXTRAS.find((e) => e.id === id)?.price ?? 0),
    0,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (step === 'extras') setStep('done')
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [step, onClose])

  // Bron kodi 5 soniya ko'rinib turadi, keyin oyna o'zi yopiladi.
  useEffect(() => {
    if (step !== 'done') return
    if (left <= 0) {
      onClose()
      return
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [step, left, onClose])

  const toggleExtra = (id: string) =>
    setExtras((s) => (s.includes(id) ? s.filter((e) => e !== id) : [...s, id]))

  const confirm = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    const result = await createBooking({
      computerId: pc.id,
      computerLabel: pc.label,
      date,
      startTime: time,
      hours,
      extras: [],
      total: baseTotal,
      paymentMethod: 'cash',
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error || t('bookingError'))
      return
    }
    setCode(result.code ?? '—')
    setBookingId(result.id ?? null)
    setStep('extras')
  }

  const saveExtras = async () => {
    if (!bookingId || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras }),
      })
      if (!res.ok) throw new Error('xatolik')
      await refreshBookings().catch(() => {})
      setStep('done')
    } catch {
      setError(t('extrasSaveError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => (step === 'extras' ? setStep('done') : onClose())}
      role="dialog"
      aria-modal="true"
      aria-label={pc.label}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'done' ? (
          <div className="py-2 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </span>
            <h3 className="mt-4 font-heading text-xl font-bold">
              {t('bookingAcceptedTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('codeRemember')}</p>
            <div className="my-5 rounded-xl border border-dashed border-primary/40 bg-primary/10 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('bookingCode')}
              </p>
              <p className="text-mono-num mt-1 text-4xl font-bold tracking-[0.3em] text-primary">
                {code}
              </p>
            </div>
            <Button className="w-full" onClick={onClose}>
              {t('gotIt', { n: left })}
            </Button>
          </div>
        ) : step === 'extras' ? (
          <>
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-6 w-6" />
              </span>
              <h3 className="mt-3 font-heading text-lg font-bold">
                {t('bookingAcceptedTitle')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('extraOfferDesc')}</p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('extraDrinks')}
              </p>
              {EXTRAS.filter((ex) => ex.category === 'drink').map((ex) => {
                const active = extras.includes(ex.id)
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleExtra(ex.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-primary bg-accent' : 'border-border hover:bg-secondary',
                    )}
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-md border',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {t(EXTRA_NAME_KEYS[ex.id] ?? ex.name)}
                    </span>
                    <span className="text-mono-num text-sm">+{formatSom(ex.price)}</span>
                  </button>
                )
              })}

              <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('extraFood')}
              </p>
              {EXTRAS.filter((ex) => ex.category === 'food').map((ex) => {
                const active = extras.includes(ex.id)
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleExtra(ex.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-primary bg-accent' : 'border-border hover:bg-secondary',
                    )}
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-md border',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {t(EXTRA_NAME_KEYS[ex.id] ?? ex.name)}
                    </span>
                    <span className="text-mono-num text-sm">+{formatSom(ex.price)}</span>
                  </button>
                )
              })}
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('done')}>
                {t('skip')}
              </Button>
              <Button
                className="flex-1"
                onClick={saveExtras}
                disabled={!extras.length || submitting}
              >
                {submitting
                  ? t('saving')
                  : t('addExtras', { amount: formatSom(extrasTotal) })}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-mono-num font-heading text-2xl font-bold">{pc.label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{info.name}</span>
                  <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
                </div>
              </div>
              <button
                onClick={onClose}
                className="-mr-1 -mt-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={t('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">{t('priceLabel')}</span>
              <span className="text-mono-num font-bold text-primary">
                {formatSom(info.pricePerHour)}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  {t('som')}
                  {t('perHour')}
                </span>
              </span>
            </div>

            {available ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('dateAndTime')}
                </p>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
                  {TIMES.map((tm) => (
                    <button
                      key={tm}
                      onClick={() => setTime(tm)}
                      className={cn(
                        'text-mono-num shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                        time === tm
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-secondary',
                      )}
                    >
                      {tm}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('hoursLabel')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHours(h)}
                      className={cn(
                        'text-mono-num h-9 w-10 rounded-lg border text-sm font-medium transition-colors',
                        hours === h
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-secondary',
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleFavorite(pc.id)}
                    aria-label={t('favorite')}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        currentUser?.favorites.includes(pc.id) && 'fill-gold text-gold',
                      )}
                    />
                  </Button>
                  <Button className="flex-1" onClick={confirm} disabled={submitting}>
                    {submitting
                      ? t('sending')
                      : t('bookFor', { amount: formatSom(baseTotal) })}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-secondary/60 px-3 py-3 text-sm text-muted-foreground">
                {t('notAvailableNow', {
                  status: t(status.labelKey).toLowerCase(),
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
