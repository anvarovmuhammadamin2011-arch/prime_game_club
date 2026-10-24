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
  { icon: Zap, title: 'Birinchi bron', desc: 'Ilk bron qildingiz', earned: true },
  { icon: Flame, title: '100 soat', desc: '100 soat o\'ynadingiz', earned: true },
  { icon: Crown, title: 'VIP mijoz', desc: 'VIP zonada o\'ynadingiz', earned: true },
  { icon: Trophy, title: 'Marafon', desc: '12 soatlik sessiya', earned: false },
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
    showNotification('Referal kod nusxalandi', 'success')
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('profile')} subtitle="Hisob ma'lumotlari va yutuqlar" />

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
            A'zo bo'lgan: {currentUser.joinedAt}
          </p>
        </div>
        <Badge tone="gold" className="self-start sm:self-center">
          <Crown className="h-3.5 w-3.5" /> Premium
        </Badge>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={t('bonusPoints')}
          value={`${currentUser.bonusPoints}`}
          hint="ball"
          icon={<Star className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label="O'ynalgan"
          value={`${currentUser.hoursPlayed}`}
          hint="soat"
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
              <h3 className="font-heading font-semibold">Sodiqlik dasturi</h3>
              <p className="text-sm text-muted-foreground">
                Har 100 ball = 15,000 so'm
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Keyingi mukofotgacha</span>
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
              ? `${Math.floor(currentUser.bonusPoints / 100) * 15000} so'm olish`
              : 'Yetarli ball yo\'q'}
          </Button>
        </Card>

        {/* Referral */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold">Do'stni taklif qiling</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Har bir do'st uchun ikkalangiz ham 20,000 so'm + 100 ball olasiz.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center rounded-lg border border-dashed border-border bg-secondary px-4">
              <span className="text-mono-num font-semibold tracking-wider">
                {currentUser.referralCode}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={copyReferral} aria-label="Nusxalash">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Achievements */}
      <div>
        <PageHeader title="Yutuqlar" subtitle="To'plangan nishonlar" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const Icon = a.icon
            return (
              <Card
                key={a.title}
                className={`flex flex-col items-center p-5 text-center ${a.earned ? '' : 'opacity-50'}`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.earned ? 'bg-gold/20 text-gold' : 'bg-secondary text-muted-foreground'}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* History */}
      <div>
        <PageHeader title="Bron tarixi" subtitle="Barcha bronlaringiz" />
        {history.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Hali bron qilmadingiz.
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {history.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-mono-num font-medium">{b.computerLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.code ? `Kod: ${b.code} · ` : ''}
                    {b.date} · {b.startTime} · {b.hours} soat
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
                      ? 'Tasdiqlangan'
                      : b.status === 'pending'
                        ? t('pending')
                        : b.status === 'rejected'
                          ? 'Rad etilgan'
                          : 'Yakunlangan'}
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
