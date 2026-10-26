'use client'

import { useApp } from '@/context/app-context'
import { Card, PageHeader, StatCard } from '@/components/ui/primitives'
import { BarChart } from '@/components/charts'
import { formatSom } from '@/lib/format'
import { MONTHLY_REVENUE } from '@/lib/mock-data'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Monitor,
  ArrowUpRight,
} from 'lucide-react'

export default function SuperadminDashboard() {
  const { t, users, bookings, computers, expenses, barSales } = useApp()

  const monthRevenue = 64_000_000
  const monthExpense = expenses.reduce((s, e) => s + e.amount, 0)
  const profit = monthRevenue - monthExpense
  const margin = Math.round((profit / monthRevenue) * 100)
  const totalUsers = users.filter((u) => u.role === 'user').length
  const utilization = Math.round(
    (computers.filter((c) => c.status === 'booked').length / computers.length) * 100,
  )

  return (
    <div>
      <PageHeader
        title={t('superadminPanel')}
        subtitle={t('businessOverview')}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t('monthlyRevenue')}
          value={formatSom(monthRevenue)}
          hint={`+12% ${t('vsPrevMonth')}`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('monthlyExpense')}
          value={formatSom(monthExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label={t('netProfit')}
          value={formatSom(profit)}
          hint={t('marginLabel', { n: margin })}
          icon={<Wallet className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label={t('utilization')}
          value={`${utilization}%`}
          icon={<Monitor className="h-5 w-5" />}
          tone="primary"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3 sm:mt-6">
        <div className="lg:col-span-2">
          <BarChart
            title={t('revenueVsExpense')}
            unit="M"
            data={MONTHLY_REVENUE.map((m, i) => ({
              label: t(
                ['monthJan', 'monthFeb', 'monthMar', 'monthApr', 'monthMay', 'monthJun'][i] ??
                  m.month,
              ),
              value: m.revenue,
              secondary: m.expense,
            }))}
          />
          <div className="mt-3 flex items-center gap-4 px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
              {t('revenue')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-border" />
              {t('expense')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {t('totalUsers')}
              </div>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </div>
            <p className="text-mono-num mt-3 text-3xl font-bold">{totalUsers}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('activeMembers')}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              {t('totalBookings')}
            </div>
            <p className="text-mono-num mt-3 text-3xl font-bold">
              {bookings.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('barSales')}: {barSales.length}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
