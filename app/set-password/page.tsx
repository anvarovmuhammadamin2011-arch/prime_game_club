'use client'

import { useApp } from '@/context/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthBrand } from '@/components/auth-brand'
import { Notifications } from '@/components/notifications'
import { Button, Input } from '@/components/ui/primitives'
import { BOT_URL, BOT_USERNAME } from '@/lib/bot-link'
import { getTelegramInitData } from '@/lib/telegram'
import { Gamepad2, KeyRound, Loader2, ShieldCheck } from 'lucide-react'

/**
 * Botda telefon raqamini ulashgandan keyin Mini App'da birinchi marta
 * parol o'rnatish sahifasi. Keyingi kirishlar telefon + parol orqali.
 */
export default function SetPasswordPage() {
  const { registerVerified, currentUser, hydrated, t } = useApp()
  const router = useRouter()

  const [initData, setInitData] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [missing, setMissing] = useState(false)
  const [notLinked, setNotLinked] = useState(false)
  const [already, setAlready] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (hydrated && currentUser) router.replace('/home')
  }, [hydrated, currentUser, router])

  // Telegram initData ba'zan sahifa ochilgandan keyin qo'shiladi.
  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const timer = setInterval(async () => {
      attempts += 1
      const data = getTelegramInitData()

      if (!data) {
        if (attempts >= 25) {
          clearInterval(timer)
          if (!cancelled) {
            setMissing(true)
            setLoading(false)
          }
        }
        return
      }

      clearInterval(timer)
      if (cancelled) return
      setInitData(data)

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: data }),
        })
        const payload = (await res.json().catch(() => null)) as
          | {
              ok?: boolean
              needs_password?: boolean
              user?: { name?: string; phone?: string }
            }
          | null

        if (cancelled) return
        if (res.ok && payload?.ok && payload.user) {
          setName(payload.user.name || '')
          setPhone(payload.user.phone || '')
          setAlready(!payload.needs_password)
        } else if (res.status === 404) {
          setNotLinked(true)
        } else {
          setMissing(true)
        }
      } catch {
        setMissing(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t('errPin'))
      return
    }
    if (password !== confirm) {
      setError(t('errPinMismatch'))
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, initData }),
      })
      const payload = (await res.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: string
            user?: { name?: string; phone?: string }
          }
        | null

      if (!res.ok || !payload?.ok) {
        if (payload?.error === 'already_set') setAlready(true)
        setError(
          payload?.error === 'invalid_password'
            ? t('errPin')
            : payload?.error === 'already_set'
              ? t('setPasswordAlready')
              : t('errSetPassword'),
        )
        return
      }

      if (registerVerified(payload.user?.name || name, payload.user?.phone || phone)) {
        router.replace('/home')
      }
    } catch {
      setError(t('errSetPassword'))
    } finally {
      setSubmitting(false)
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

          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {t('setPasswordTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('setPasswordSubtitle')}
          </p>

          {loading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('checking')}
            </div>
          ) : missing || notLinked ? (
            <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
              <p>{missing ? t('setPasswordNoTelegram') : t('setPasswordNotLinked')}</p>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-medium text-primary hover:underline"
              >
                @{BOT_USERNAME} — {t('openBot')}
              </a>
            </div>
          ) : already ? (
            <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
              <p>{t('setPasswordAlready')}</p>
              <Link href="/" className="mt-2 inline-block font-medium text-primary hover:underline">
                {t('goToLogin')}
              </Link>
            </div>
          ) : (
            <>
              {phone && (
                <p className="text-mono-num mt-3 text-sm text-muted-foreground">
                  {phone}
                  {name ? ` · ${name}` : ''}
                </p>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
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
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="password-confirm">
                    {t('pinConfirm')}
                  </label>
                  <Input
                    id="password-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>

                <p className="text-xs text-muted-foreground">{t('setPasswordHint')}</p>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {submitting ? t('saving') : t('savePassword')}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('secureData')}
          </div>
        </div>
      </div>
    </div>
  )
}
