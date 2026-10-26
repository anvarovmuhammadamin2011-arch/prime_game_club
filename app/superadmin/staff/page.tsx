'use client'

import { useApp } from '@/context/app-context'
import { Card, PageHeader, Badge, StatCard } from '@/components/ui/primitives'
import { formatSom } from '@/lib/format'
import { Users, Clock, Wallet, TrendingUp } from 'lucide-react'

export default function StaffPage() {
  const { t, staff } = useApp()
  const roleKey: Record<string, string> = {
    Administrator: 'roleAdmin',
    'Bar menejeri': 'roleBarManager',
    Texnik: 'roleTechnician',
  }

  const totalSalary = staff.reduce((s, x) => s + x.salary, 0)
  const totalRevenue = staff.reduce((s, x) => s + x.revenueGenerated, 0)

  return (
    <div>
      <PageHeader title={t('staff')} subtitle={t('teamManagement')} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label={t('totalStaff')}
          value={String(staff.length)}
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label={t('salaryFund')}
          value={formatSom(totalSalary)}
          icon={<Wallet className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label={t('revenueGenerated')}
          value={formatSom(totalRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => {
          const initials = s.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
          return (
            <Card key={s.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-heading font-bold text-accent-foreground">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <Badge tone="primary">{t(roleKey[s.role] ?? s.role)}</Badge>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {t('shift')}
                  </span>
                  <span className="text-mono-num">{s.shift}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('salary')}</span>
                  <span className="text-mono-num font-medium">
                    {formatSom(s.salary)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('generated')}</span>
                  <span className="text-mono-num font-medium text-success">
                    {formatSom(s.revenueGenerated)}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
