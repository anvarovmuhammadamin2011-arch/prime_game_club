'use client'

import { useApp } from '@/context/app-context'
import { useMemo, useState } from 'react'
import { Card, PageHeader } from '@/components/ui/primitives'
import { PcModal } from '@/components/pc-modal'
import { COMPUTER_TYPES } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import { formatSom } from '@/lib/format'
import type { Computer, ComputerType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cpu } from 'lucide-react'

type Filter = 'all' | 'available' | ComputerType

const ZONES: { type: ComputerType; nameKey: string }[] = [
  { type: 'VIP', nameKey: 'zoneVip' },
  { type: 'GAMING_PRO', nameKey: 'zoneGamingPro' },
  { type: 'STANDARD', nameKey: 'zoneStandard' },
  { type: 'PS5', nameKey: 'zoneConsole' },
]

const FILTER_LABELS: Record<ComputerType, string> = {
  VIP: 'VIP',
  GAMING_PRO: 'Gaming Pro',
  STANDARD: 'Standard',
  PS5: 'PS5',
}

export default function MapPage() {
  const { computers, t } = useApp()
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
      { id: 'all', label: t('all') },
      { id: 'available', label: t('available') },
      ...zones.map((z) => ({ id: z.type, label: FILTER_LABELS[z.type] })),
    ],
    [zones, t],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('mapTitle')}
        subtitle={t('mapSubtitle')}
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

      <div className="space-y-6">
        {zones.map((zone) => {
          const zoneComputers = computers.filter((c) => c.type === zone.type)
          return (
            <Card key={zone.type} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading font-semibold">{t(zone.nameKey)}</h3>
                <span className="text-mono-num text-xs text-muted-foreground">
                  {formatSom(COMPUTER_TYPES[zone.type].pricePerHour)} {t('som')}
                  {t('perHour')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {zoneComputers.map((c) => {
                  const meta = STATUS_META[c.status]
                  const dim = !matches(c)
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={cn(
                        'group relative flex aspect-square flex-col items-center justify-center rounded-lg border border-border text-center transition-all hover:border-primary/40',
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
                        className={cn('absolute right-1.5 top-1.5 h-2 w-2 rounded-full', meta.dot)}
                      />
                      <Cpu className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
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

      {selected && (
        <PcModal key={selected.id} pc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
