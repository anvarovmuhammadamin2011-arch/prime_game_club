'use client'

import { useApp } from '@/context/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthBrand } from '@/components/auth-brand'
import { Notifications } from '@/components/notifications'
import { Button, Input } from '@/components/ui/primitives'
import { ArrowLeft, Gamepad2, Loader2, ShieldCheck, Smartphone } from 'lucide-react'

type Step = 'phone' | 'code'

const BOT_URL = 'https://t.me/legionclubrobot'

export default function RegisterPage() {
  const { registerVerified, currentUser, hydrated, t } = useApp()
  const router = useRouter()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [masked, setMasked] = useState('')
  const [botUrl, setBotUrl] = useState(BOT_URL)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (hydrated && currentUser) router.replace('/home')
  }, [hydrated, currentUser, router])

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setNotFound(false)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(data.message || 'Xatolik yuz berdi. Qayta urinib ko‘ring.')
        setNotFound(data.error === 'not_found')
        return
      }

      setName(data.name || '')
      setMasked(data.phone || phone)
      setBotUrl(data.botUrl || BOT_URL)
      setStep('code')
      setCode('')
      setResendIn(45)
    } catch {
      setError('Server bilan aloqa yo‘q. Internetni tekshiring.')
    } finally {
      setLoading(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(data.message || 'Kod noto‘g‘ri.')
        return
      }

      if (registerVerified(data.user?.name || name, data.user?.phone || phone)) {
        router.replace('/home')
      }
    } catch {
      setError('Server bilan aloqa yo‘q. Internetni tekshiring.')
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
            <span className="font-heading text-lg font-bold">Legion Game Club</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight">{t('register')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 'phone'
              ? 'Telefon raqamingizni kiriting — tasdiqlash kodini Telegram botimiz yuboradi.'
              : 'Telegram’ga yuborilgan 4 xonali kodni kiriting.'}
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3">
            <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <p className="text-sm">
              {step === 'phone' ? (
                <>
                  Raqam avval <b>@{botUrl.replace('https://t.me/', '')}</b> botiga ulangan bo‘lishi
                  kerak. <a href={botUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Botni ochish</a>
                </>
              ) : (
                <>
                  Kod <b>{masked}</b> raqamiga bog‘langan Telegram chatiga yuborildi.
                </>
              )}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={requestCode} className="mt-6 space-y-4">
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
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                  {notFound && (
                    <a
                      href={botUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block font-medium underline"
                    >
                      @legionclubrobot ga o‘tish →
                    </a>
                  )}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? 'Yuborilmoqda...' : 'Kod yuborish'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-4">
              {name && (
                <p className="text-sm text-muted-foreground">
                  Salom, <span className="font-medium text-foreground">{name}</span>! 👋
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="code">
                  Tasdiqlash kodi
                </label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  className="text-center text-lg tracking-[0.5em]"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading || code.length !== 4}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash va kirish'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setCode('')
                    setError('')
                    setNotFound(false)
                  }}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Raqamni o‘zgartirish
                </button>

                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  onClick={() => requestCode()}
                  className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : 'Kodni qayta yuborish'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hisobingiz bormi?{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
