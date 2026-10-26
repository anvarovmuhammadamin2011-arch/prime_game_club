'use client'

import { useApp } from '@/context/app-context'
import { Card, Button, Badge, StatCard, PageHeader } from '@/components/ui/primitives'
import { formatSom } from '@/lib/format'
import { phoneKey } from '@/lib/phone'
import {
  Star,
  Clock,
  Copy,
  Gift,
  Trophy,
  Zap,
  Flame,
  Crown,
} from 'lucide-react'

const ACHIEVEMENTS = [
  { icon: Zap, titleKey: 'ach1Title', descKey: 'ach1Desc', earned: true },
  { icon: Flame, titleKey: 'ach2Title', descKey: 'ach2Desc', earned: true },
  { icon: Crown, titleKey: 'ach3Title', descKey: 'ach3Desc', earned: true },
  { icon: Trophy, titleKey: 'ach4Title', descKey: 'ach4Desc', earned: false },
]

export default function ProfilePage() {
  const { currentUser, bookings, redeemBonusPoints, showNotification, t } = useApp()
  if (!currentUser) return null

  const history = bookings.filter((b) =>
    b.phone ? phoneKey(b.phone) === phoneKey(currentUser.phone) : b.userId === currentUser.id,
  )
  const canRedeem = currentUser.bonusPoints >= 100

  const copyReferral = () => {
    navigator.clipboard?.writeText(currentUser.referralCode)
    showNotification(t('copied'), 'success')
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('profile')} subtitle={t('profileSubtitle')} />

      {/* Profile header */}
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
          {currentUser.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-bold">{currentUser.name}</h2>
          <p className="text-mono-num text-sm text-muted-foreground">
            {currentUser.phone}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('memberSince', { date: currentUser.joinedAt })}
          </p>
        </div>
        <Badge tone="gold" className="self-start sm:self-center">
          <Crown className="h-3.5 w-3.5" /> {t('premium')}
        </Badge>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={t('bonusPoints')}
          value={`${currentUser.bonusPoints}`}
          hint={t('bonusPoints')}
          icon={<Star className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label={t('played')}
          value={`${currentUser.hoursPlayed}`}
          hint={t('hour')}
          icon={<Clock className="h-5 w-5" />}
          tone="info"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Loyalty */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/20 text-gold">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading font-semibold">{t('loyaltyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('loyaltyRate')}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('nextReward')}</span>
              <span className="text-mono-num font-medium">
                {currentUser.bonusPoints % 100}/100
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${currentUser.bonusPoints % 100}%` }}
              />
            </div>
          </div>
          <Button
            className="mt-5 w-full"
            variant="gold"
            disabled={!canRedeem}
            onClick={redeemBonusPoints}
          >
            {canRedeem
              ? t('redeem', {
                  amount: formatSom(Math.floor(currentUser.bonusPoints / 100) * 15000),
                })
              : t('notEnoughPoints')}
          </Button>
        </Card>

        {/* Referral */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold">{t('referralTitle')}</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {t('referralDesc')}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center rounded-lg border border-dashed border-border bg-secondary px-4">
              <span className="text-mono-num font-semibold tracking-wider">
                {currentUser.referralCode}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={copyReferral} aria-label={t('copy')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Achievements */}
      <div>
        <PageHeader title={t('achievements')} subtitle={t('achievementsSubtitle')} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const Icon = a.icon
            return (
              <Card
                key={a.titleKey}
                className={`flex flex-col items-center p-5 text-center ${a.earned ? '' : 'opacity-50'}`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.earned ? 'bg-gold/20 text-gold' : 'bg-secondary text-muted-foreground'}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-medium">{t(a.titleKey)}</p>
                <p className="text-xs text-muted-foreground">{t(a.descKey)}</p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* History */}
      <div>
        <PageHeader title={t('bookingHistory')} subtitle={t('allBookings')} />
        {history.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {t('noBookingsYet')}
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {history.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-mono-num font-medium">{b.computerLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.code ? `${t('codeLabel')}: ${b.code} · ` : ''}
                    {t('bookingMeta', {
                      date: b.date,
                      time: b.startTime,
                      hours: b.hours,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-mono-num text-sm font-semibold">
                    {formatSom(b.total)}
                  </p>
                  <Badge
                    tone={
                      b.status === 'confirmed'
                        ? 'success'
                        : b.status === 'pending'
                          ? 'info'
                          : b.status === 'rejected'
                            ? 'danger'
                            : 'default'
                    }
                    className="mt-1"
                  >
                    {b.status === 'confirmed'
                      ? t('confirmed')
                      : b.status === 'pending'
                        ? t('pending')
                        : b.status === 'rejected'
                          ? t('rejected')
                          : t('completed')}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
