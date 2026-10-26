'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button } from '@/components/ui/primitives'
import { COMPUTER_TYPES, EXTRAS } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import { formatSom } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/app-context'
import { Check, Cpu, MemoryStick, Monitor, Star, X } from 'lucide-react'
import type { Computer } from '@/lib/types'

const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
const HOURS = [1, 2, 3, 4, 6, 8]

/**
 * Xaritada kompyuter tanlanganda ochiladigan oyna:
 * ma'lumot + shu yerning o'zida bron qilish.
 */
export function PcModal({ pc, onClose }: { pc: Computer; onClose: () => void }) {
  const { currentUser, createBooking, toggleFavorite, t } = useApp()
  const router = useRouter()
  const info = COMPUTER_TYPES[pc.type]
  const status = STATUS_META[pc.status]
  const available = pc.status === 'available'

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('18:00')
  const [hours, setHours] = useState(2)
  const [extras, setExtras] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState<string | null>(null)

  const total = useMemo(
    () =>
      info.pricePerHour * hours +
      extras.reduce((sum, id) => sum + (EXTRAS.find((e) => e.id === id)?.price ?? 0), 0),
    [info.pricePerHour, hours, extras],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

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
      extras,
      total,
      paymentMethod: 'cash',
    })
    setSubmitting(false)
    if (result.ok) setCode(result.code ?? '—')
    else setError(result.error || "Bron qilishda xatolik")
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={pc.label}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {code ? (
          <div className="py-2 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </span>
            <h3 className="mt-4 font-heading text-xl font-bold">Bron qabul qilindi!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Kodni saqlab qo‘ying — klubda administratorga ayting.
            </p>
            <div className="my-5 rounded-xl border border-dashed border-primary/40 bg-primary/10 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Bron kodi</p>
              <p className="text-mono-num mt-1 text-4xl font-bold tracking-[0.3em] text-primary">
                {code}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                onClose()
                router.push('/home')
              }}
            >
              Tushundim
            </Button>
          </div>
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
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Cpu, value: info.gpu },
                { icon: MemoryStick, value: info.ram },
                { icon: Monitor, value: info.display },
              ].map(({ icon: Icon, value }) => (
                <div key={value} className="rounded-lg bg-secondary/60 p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="mt-1.5 text-xs font-medium leading-tight">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Narx</span>
              <span className="text-mono-num font-bold text-primary">
                {formatSom(info.pricePerHour)}{' '}
                <span className="text-xs font-normal text-muted-foreground">{t('som')}/soat</span>
              </span>
            </div>

            {available ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sana va vaqt
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
                  Soat
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

                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Qo&apos;shimcha
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXTRAS.map((ex) => {
                    const active = extras.includes(ex.id)
                    return (
                      <button
                        key={ex.id}
                        onClick={() => toggleExtra(ex.id)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-accent text-foreground'
                            : 'border-border text-muted-foreground hover:bg-secondary',
                        )}
                      >
                        {ex.name} · +{formatSom(ex.price)}
                      </button>
                    )
                  })}
                </div>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleFavorite(pc.id)}
                    aria-label="Sevimli"
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        currentUser?.favorites.includes(pc.id) && 'fill-gold text-gold',
                      )}
                    />
                  </Button>
                  <Button className="flex-1" onClick={confirm} disabled={submitting}>
                    {submitting ? 'Yuborilmoqda...' : `Bron qilish · ${formatSom(total)}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-secondary/60 px-3 py-3 text-sm text-muted-foreground">
                Bu kompyuter hozir {t(status.labelKey).toLowerCase()}. Boshqa bo&apos;sh
                kompyuterni tanlang.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
