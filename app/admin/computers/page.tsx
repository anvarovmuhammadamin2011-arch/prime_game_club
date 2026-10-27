'use client'

import { useApp } from '@/context/app-context'
import { Card, PageHeader, Button, Badge, Input } from '@/components/ui/primitives'
import { COMPUTER_TYPES } from '@/lib/mock-data'
import { STATUS_META } from '@/lib/status'
import { formatClock, localDateStr } from '@/lib/pc-session.mjs'
import { useState } from 'react'
import { Wrench, Thermometer, Clock, Power } from 'lucide-react'

export default function ComputersPage() {
  const {
    t,
    computers,
    setMaintenanceMode,
    startPcSession,
    stopPcSession,
  } = useApp()
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [startingId, setStartingId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('')
  const [hours, setHours] = useState('1')

  const openStart = (id: string) => {
    setStartingId(id)
    setStartTime(formatClock(new Date().toISOString()))
    setHours('1')
  }

  const begin = (id: string) => {
    if (startPcSession(id, localDateStr(), startTime, Number(hours))) {
      setStartingId(null)
    }
  }
  const zones = ['all', ...Array.from(new Set(computers.map((c) => c.zone)))]

  const filtered =
    zoneFilter === 'all'
      ? computers
      : computers.filter((c) => c.zone === zoneFilter)

  return (
    <div>
      <PageHeader
        title={t('computerManagement')}
        subtitle={t('remoteControl')}
      />

      {/* Zone filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {zones.map((z) => (
          <button
            key={z}
            onClick={() => setZoneFilter(z)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              zoneFilter === z
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {z === 'all' ? t('all') : z}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const meta = STATUS_META[c.status]
          const info = COMPUTER_TYPES[c.type]
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-mono-num font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{info.name}</p>
                </div>
                <Badge tone={meta.tone}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {t(meta.labelKey)}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Thermometer className={`h-3.5 w-3.5 ${c.temp > 60 ? 'text-destructive' : ''}`} />
                  <span className="text-mono-num">{c.temp}°C</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-mono-num">{c.uptimeHours}h</span>
                </span>
              </div>

              {c.sessionEndsAt && (
                <p className="mt-3 rounded-lg bg-secondary/60 px-2.5 py-2 text-xs text-muted-foreground">
                  {new Date(c.sessionStartedAt || '').getTime() > Date.now()
                    ? t('sessionStarts', {
                        time: formatClock(c.sessionStartedAt || ''),
                      })
                    : t('sessionUntil', {
                        time: formatClock(c.sessionEndsAt),
                      })}
                </p>
              )}

              {startingId === c.id && !c.sessionEndsAt && (
                <div className="mt-3 space-y-2 rounded-lg border border-border p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>{t('startTime')}</span>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-9"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>{t('durationHours')}</span>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="h-9"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => begin(c.id)}
                    >
                      {t('startSession')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStartingId(null)}
                    >
                      {t('close')}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {c.sessionEndsAt ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => stopPcSession(c.id)}
                  >
                    <Power className="h-4 w-4" />
                    {t('turnOff')}
                  </Button>
                ) : (
                  c.status !== 'maintenance' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStart(c.id)}
                    >
                      <Power className="h-4 w-4" />
                      {t('turnOn')}
                    </Button>
                  )
                )}
                <Button
                  variant={c.status === 'maintenance' ? 'danger' : 'outline'}
                  size="sm"
                  onClick={() => setMaintenanceMode(c.id, c.status !== 'maintenance')}
                >
                  <Wrench className="h-4 w-4" />
                  {c.status === 'maintenance'
                    ? t('endMaintenance')
                    : t('startMaintenance')}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
