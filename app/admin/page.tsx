'use client'

import { useApp } from '@/context/app-context'
import { Card, PageHeader, StatCard, Badge, Button } from '@/components/ui/primitives'
import { LoadBars } from '@/components/charts'
import { formatSom } from '@/lib/format'
import { PEAK_HOURS, COMPUTER_TYPES } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import Link from 'next/link'
import {
  MonitorSmartphone,
  Activity,
  ClipboardCheck,
  Coffee,
  Thermometer,
  ArrowRight,
} from 'lucide-react'

export default function AdminDashboard() {
  const { t, computers, bookings, barSales } = useApp()

  const total = computers.length
  const active = computers.filter((c) => c.status === 'booked').length
  const available = computers.filter((c) => c.status === 'available').length
  const maintenance = computers.filter((c) => c.status === 'maintenance').length
  const pending = bookings.filter((b) => b.status === 'pending')
  const barRevenue = barSales.reduce((sum, s) => sum + s.total, 0)
  const hotComputers = computers
    .filter((c) => c.temp > 60)
    .sort((a, b) => b.temp - a.temp)
    .slice(0, 4)

  const statusCounts = (['available', 'booked', 'maintenance', 'pending'] as const).map(
    (st) => ({
      st,
      count: computers.filter((c) => c.status === st).length,
    }),
  )

  return (
    <div>
      <PageHeader
        title={t('adminPanel')}
        subtitle={t('realtimeOverview')}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t('activeSessions')}
          value={`${active}/${total}`}
          icon={<Activity className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label={t('available')}
          value={String(available)}
          icon={<MonitorSmartphone className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('pendingBookings')}
          value={String(pending.length)}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label={t('barRevenue')}
          value={formatSom(barRevenue)}
          hint={t('today')}
          icon={<Coffee className="h-5 w-5" />}
          tone="gold"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3 sm:mt-6">
        <div className="lg:col-span-2">
          <LoadBars data={PEAK_HOURS.map((p) => ({ label: p.hour, value: p.load }))} title={t('peakHours')} />
        </div>

        <Card className="p-5">
          <h3 className="mb-4 font-medium">{t('parkStatus')}</h3>
          <div className="flex flex-col gap-3">
            {statusCounts.map(({ st, count }) => {
              const meta = STATUS_META[st]
              return (
                <div key={st} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <span className="text-sm">{t(meta.labelKey)}</span>
                  </div>
                  <span className="text-mono-num text-sm font-semibold">{count}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{t('maintenance')}</p>
            <p className="text-mono-num text-lg font-bold text-warning">{maintenance}</p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 sm:mt-6">
        {/* Pending approvals */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">{t('pendingBookings')}</h3>
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">
                {t('viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('noPending')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-mono-num text-primary">{b.code || '—'}</span>
                      {' · '}
                      {b.computerLabel} · {b.startTime} · {b.hours}
                      {t('hoursShort')}
                    </p>
                  </div>
                  <span className="text-mono-num text-sm font-semibold">
                    {formatSom(b.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Hot computers */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-medium">
            <Thermometer className="h-4 w-4 text-destructive" />
            {t('highTemp')}
          </h3>
          {hotComputers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('allNormal')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {hotComputers.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-mono-num text-sm font-medium">{c.label}</span>
                    <Badge tone="default">{COMPUTER_TYPES[c.type].name}</Badge>
                  </div>
                  <span
                    className={`text-mono-num text-sm font-semibold ${c.temp > 70 ? 'text-destructive' : 'text-warning'}`}
                  >
                    {c.temp}°C
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
