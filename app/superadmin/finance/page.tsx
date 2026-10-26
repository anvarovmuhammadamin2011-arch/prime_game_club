'use client'

import { useApp } from '@/context/app-context'
import {
  Card,
  PageHeader,
  Button,
  Input,
  StatCard,
  Badge,
} from '@/components/ui/primitives'
import { formatSom } from '@/lib/format'
import { useState } from 'react'
import { Plus, Wallet, TrendingDown, Receipt } from 'lucide-react'

export default function FinancePage() {
  const { t, expenses, addExpense } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'Kommunal',
    amount: '',
  })

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
  const revenue = 64_000_000
  const profit = revenue - totalExpense

  const titleKey: Record<string, string> = {
    'Elektr energiya': 'expElectricity',
    'Xodimlar maoshi': 'expSalary',
    'Internet (1Gbps)': 'expInternet',
    'Bar mahsulotlari': 'expBarStock',
  }

  const categoryKey: Record<string, string> = {
    Kommunal: 'catUtility',
    Maosh: 'catSalary',
    Inventar: 'catInventory',
    Marketing: 'catMarketing',
    Boshqa: 'catOther',
  }

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = t(categoryKey[e.category] ?? e.category)
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})

  const submit = () => {
    if (!form.title || !form.amount) return
    addExpense({
      title: form.title,
      category: form.category,
      amount: Number(form.amount),
      date: new Date().toISOString().slice(0, 10),
    })
    setForm({ title: '', category: 'Kommunal', amount: '' })
    setShowAdd(false)
  }

  return (
    <div>
      <PageHeader
        title={t('finance')}
        subtitle={t('revenueExpenseTracking')}
        action={
          <Button variant="outline" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-4 w-4" />
            {t('addExpense')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label={t('revenue')}
          value={formatSom(revenue)}
          icon={<Wallet className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('totalExpense')}
          value={formatSom(totalExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label={t('netProfit')}
          value={formatSom(profit)}
          icon={<Receipt className="h-5 w-5" />}
          tone="gold"
        />
      </div>

      {showAdd && (
        <Card className="mt-4 p-5">
          <h3 className="mb-4 font-medium">{t('addExpense')}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder={t('expenseTitle')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="Kommunal">{t('catUtility')}</option>
              <option value="Maosh">{t('catSalary')}</option>
              <option value="Inventar">{t('catInventory')}</option>
              <option value="Marketing">{t('catMarketing')}</option>
              <option value="Boshqa">{t('catOther')}</option>
            </select>
            <Input
              type="number"
              placeholder={t('amount')}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={submit}>{t('save')}</Button>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-medium">{t('byCategory')}</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(byCategory).map(([cat, amount]) => {
              const pct = Math.round((amount / totalExpense) * 100)
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{cat}</span>
                    <span className="text-mono-num text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-medium">{t('expenseHistory')}</h3>
          <div className="flex flex-col divide-y divide-border">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {t(titleKey[e.title] ?? e.title)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge tone="default">
                      {t(categoryKey[e.category] ?? e.category)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{e.date}</span>
                  </div>
                </div>
                <span className="text-mono-num font-semibold text-destructive">
                  -{formatSom(e.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
