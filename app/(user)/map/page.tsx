'use client'

import { useApp } from '@/context/app-context'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Card, Button, Badge, PageHeader } from '@/components/ui/primitives'
import { COMPUTER_TYPES } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import { formatSom } from '@/lib/format'
import type { Computer, ComputerType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Star, Cpu, MemoryStick, Monitor, X } from 'lucide-react'

type Filter = 'all' | 'available' | ComputerType

const ZONES: { type: ComputerType; name: string }[] = [
  { type: 'VIP', name: 'VIP Zona' },
  { type: 'GAMING_PRO', name: 'Gaming Pro Zona' },
  { type: 'STANDARD', name: 'Standard Zona' },
  { type: 'PS5', name: 'Console Zona' },
]

const FILTER_LABELS: Record<ComputerType, string> = {
  VIP: 'VIP',
  GAMING_PRO: 'Gaming Pro',
  STANDARD: 'Standard',
  PS5: 'PS5',
}

export default function MapPage() {
  const { computers, currentUser, toggleFavorite, t } = useApp()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Computer | null>(null)

  const matches = (c: Computer) => {
    if (filter === 'all') return true
    if (filter === 'available') return c.status === 'available'
    return c.type === filter
  }

  const legend = useMemo(
    () =>
      (['available', 'booked', 'maintenance', 'pending'] as const).map((s) => ({
        s,
        count: computers.filter((c) => c.status === s).length,
      })),
    [computers],
  )

  // Faqat mavjud kompyuterlari bor zonalarni ko'rsatamiz.
  const zones = useMemo(
    () => ZONES.filter((z) => computers.some((c) => c.type === z.type)),
    [computers],
  )

  const filters = useMemo<{ id: Filter; label: string }[]>(
    () => [
      { id: 'all', label: 'Barchasi' },
      { id: 'available', label: "Bo'sh" },
      ...zones.map((z) => ({ id: z.type, label: FILTER_LABELS[z.type] })),
    ],
    [zones],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zal xaritasi"
        subtitle="Kompyuterni tanlab tafsilotlarini ko'ring va bron qiling"
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {legend.map(({ s, count }) => (
          <div key={s} className="flex items-center gap-2 text-sm">
            <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_META[s].dot)} />
            <span className="text-muted-foreground">{t(STATUS_META[s].labelKey)}</span>
            <span className="text-mono-num font-medium">{count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Map grid */}
        <div className="space-y-6">
          {zones.map((zone) => {
            const zoneComputers = computers.filter((c) => c.type === zone.type)
            return (
              <Card key={zone.type} className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading font-semibold">{zone.name}</h3>
                  <span className="text-mono-num text-xs text-muted-foreground">
                    {formatSom(COMPUTER_TYPES[zone.type].pricePerHour)} {t('som')}/soat
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  {zoneComputers.map((c) => {
                    const meta = STATUS_META[c.status]
                    const dim = !matches(c)
                    const isSel = selected?.id === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={cn(
                          'group relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition-all',
                          isSel
                            ? 'border-primary ring-2 ring-primary/40'
                            : 'border-border hover:border-primary/40',
                          dim ? 'opacity-30' : 'opacity-100',
                          c.status === 'available'
                            ? 'bg-success/10'
                            : c.status === 'booked'
                              ? 'bg-destructive/10'
                              : c.status === 'maintenance'
                                ? 'bg-warning/10'
                                : 'bg-info/10',
                        )}
                        aria-label={c.label}
                      >
                        <span
                          className={cn(
                            'absolute right-1.5 top-1.5 h-2 w-2 rounded-full',
                            meta.dot,
                          )}
                        />
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <span className="mt-1 text-mono-num text-[10px] font-medium leading-tight">
                          {c.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>

        {/* Side panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <Card className="p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-mono-num font-heading text-xl font-bold">
                    {selected.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {COMPUTER_TYPES[selected.type].name}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary lg:hidden"
                  aria-label="Yopish"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Badge tone={STATUS_META[selected.status].tone}>
                {t(STATUS_META[selected.status].labelKey)}
              </Badge>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span>{COMPUTER_TYPES[selected.type].gpu}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                  <span>{COMPUTER_TYPES[selected.type].ram}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span>{COMPUTER_TYPES[selected.type].display}</span>
                </div>
              </div>

              <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Narx</span>
                <span className="text-mono-num text-lg font-bold text-primary">
                  {formatSom(COMPUTER_TYPES[selected.type].pricePerHour)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t('som')}/soat
                  </span>
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={selected.status !== 'available'}
                  onClick={() =>
                    router.push(`/book?pc=${selected.id}`)
                  }
                >
                  {selected.status === 'available' ? t('bookNow') : t(STATUS_META[selected.status].labelKey)}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleFavorite(selected.id)}
                  aria-label="Sevimli"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      currentUser?.favorites.includes(selected.id) &&
                        'fill-gold text-gold',
                    )}
                  />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <Cpu className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Tafsilotlarni ko'rish uchun kompyuterni tanlang
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
