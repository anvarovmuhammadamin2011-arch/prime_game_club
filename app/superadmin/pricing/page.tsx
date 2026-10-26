'use client'

import { useApp } from '@/context/app-context'
import {
  Card,
  PageHeader,
  Button,
  Input,
  Badge,
} from '@/components/ui/primitives'
import { COMPUTER_TYPES } from '@/lib/mock-data'
import { TYPE_COLOR } from '@/lib/status'
import { formatSom } from '@/lib/format'
import { useState } from 'react'
import { Cpu, MemoryStick, Monitor, Save } from 'lucide-react'
import type { ComputerType } from '@/lib/types'

export default function PricingPage() {
  const { t, updatePrice, computers } = useApp()
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.values(COMPUTER_TYPES).map((c) => [c.id, c.pricePerHour]),
    ),
  )

  const types = Object.values(COMPUTER_TYPES).filter((type) =>
    computers.some((c) => c.type === type.id),
  )

  return (
    <div>
      <PageHeader title={t('pricing')} subtitle={t('priceConfiguration')} />

      <div className="grid gap-4 sm:grid-cols-2">
        {types.map((info) => (
          <Card key={info.id} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-heading text-lg font-bold ${TYPE_COLOR[info.id as ComputerType]}`}>
                  {info.name}
                </h3>
                <Badge tone="default">{info.zone}</Badge>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                {info.gpu}
              </span>
              <span className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4" />
                {info.ram}
              </span>
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {info.display}
              </span>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <label className="mb-1.5 block text-xs text-muted-foreground">
                {t('pricePerHour')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={prices[info.id]}
                  onChange={(e) =>
                    setPrices((p) => ({
                      ...p,
                      [info.id]: Number(e.target.value),
                    }))
                  }
                  className="text-mono-num"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updatePrice(info.id, prices[info.id])}
                  aria-label={t('save')}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('current')}:{' '}
                <span className="text-mono-num">{formatSom(prices[info.id])}</span>{' '}
                {t('som')}/{t('hour')}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
