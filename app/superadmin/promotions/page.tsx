'use client'

import { useApp } from '@/context/app-context'
import {
  Card,
  PageHeader,
  Button,
  Input,
  Badge,
} from '@/components/ui/primitives'
import { useState } from 'react'
import { Plus, Tag, Power, PowerOff, Percent } from 'lucide-react'

export default function PromotionsPage() {
  const { t, promos, addPromoCode, togglePromo } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ code: '', discount: '', maxUses: '' })

  const submit = () => {
    if (!form.code || !form.discount) return
    addPromoCode({
      code: form.code.toUpperCase(),
      discount: Number(form.discount),
      maxUses: Number(form.maxUses) || 100,
    })
    setForm({ code: '', discount: '', maxUses: '' })
    setShowAdd(false)
  }

  return (
    <div>
      <PageHeader
        title={t('promotions')}
        subtitle={t('promoManagement')}
        action={
          <Button variant="outline" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-4 w-4" />
            {t('createPromo')}
          </Button>
        }
      />

      {showAdd && (
        <Card className="mb-4 p-5">
          <h3 className="mb-4 font-medium">{t('createPromo')}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder={t('promoCode')}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('discountPercent')}
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('maxUses')}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={submit}>{t('save')}</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map((p) => {
          const usagePct = Math.round((p.uses / p.maxUses) * 100)
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Tag className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-mono-num font-bold tracking-wide">
                      {p.code}
                    </p>
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <Percent className="h-3.5 w-3.5" />
                      {t('discountOff', { n: p.discount })}
                    </span>
                  </div>
                </div>
                <Badge tone={p.active ? 'success' : 'default'}>
                  {p.active ? t('active') : t('inactive')}
                </Badge>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('usage')}</span>
                  <span className="text-mono-num">
                    {p.uses}/{p.maxUses}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>

              <Button
                variant={p.active ? 'ghost' : 'outline'}
                size="sm"
                className="mt-4 w-full"
                onClick={() => togglePromo(p.id)}
              >
                {p.active ? (
                  <>
                    <PowerOff className="h-4 w-4" />
                    {t('deactivate')}
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4" />
                    {t('activate')}
                  </>
                )}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
