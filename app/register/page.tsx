'use client'

import { useApp } from '@/context/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthBrand } from '@/components/auth-brand'
import { Notifications } from '@/components/notifications'
import { Button, Input } from '@/components/ui/primitives'
import { BOT_URL, BOT_USERNAME } from '@/lib/bot-link'
import { phoneKey } from '@/lib/phone'
import { getTelegramInitData } from '@/lib/telegram'
import { Gamepad2, Loader2, ShieldCheck, Smartphone, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const { registerVerified, users, currentUser, hydrated, t, language } = useApp()
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [alreadyExists, setAlreadyExists] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hydrated && currentUser) router.replace('/home')
  }, [hydrated, currentUser, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAlreadyExists(false)

    const cleanName = name.trim().replace(/\s+/g, ' ')
    const digits = phone.replace(/\D/g, '')

    if (cleanName.length < 2) {
      setError(t('errName'))
      return
    }
    if (!/^\d{9}$/.test(digits) && !/^998\d{9}$/.test(digits)) {
      setError(t('errPhone'))
      return
    }
    if (password.length < 6) {
      setError(t('errPin'))
      return
    }
    if (password !== passwordConfirm) {
      setError(t('errPinMismatch'))
      return
    }
    if (users.some((u) => phoneKey(u.phone) === phoneKey(phone))) {
      setError(t('errPhoneExists'))
      setAlreadyExists(true)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone,
          pin: password,
          lang: language,
          initData: getTelegramInitData(),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(
          data.error === 'already_exists'
            ? t('errPhoneExists')
            : data.error === 'invalid_phone'
              ? t('errPhone')
              : data.error === 'invalid_name'
                ? t('errName')
                : data.error === 'invalid_pin'
                  ? t('errPin')
                  : t('errRegister'),
        )
        setAlreadyExists(data.error === 'already_exists')
        return
      }

      if (registerVerified(data.user?.name || cleanName, data.user?.phone || phone)) {
        router.replace('/home')
      }
    } catch {
      setError(t('errServer'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Notifications />
      <AuthBrand />

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <span className="font-heading text-lg font-bold">Prime Game Club</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight">{t('register')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('registerSubtitle')}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="name">
                {t('fullName')}
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aziz Karimov"
                autoComplete="name"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="phone">
                {t('phone')}
              </label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password">
                  {t('pinLabel')}
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password-confirm">
                  {t('pinConfirm')}
                </label>
                <Input
                  id="password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('pinHint')}
            </p>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                {alreadyExists && (
                  <Link href="/" className="mt-1 block font-medium underline">
                    {t('goToLogin')}
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? t('creating') : t('register')}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3">
            <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">{t('miniAppTitle')}</p>
              <p className="mt-1 text-muted-foreground">{t('miniAppDesc')}</p>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                @{BOT_USERNAME} {t('goToBot')}
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              {t('login')}
            </Link>
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('secureData')}
          </div>
        </div>
      </div>
    </div>
  )
}
