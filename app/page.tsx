'use client'

import { useApp } from '@/context/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthBrand } from '@/components/auth-brand'
import { Notifications } from '@/components/notifications'
import { Button, Input } from '@/components/ui/primitives'
import { Gamepad2, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import type { Role } from '@/lib/types'
import { getTelegramInitData } from '@/lib/telegram'

const DEMO: { labelKey: string; phone: string; password: string }[] = [
  { labelKey: 'demoAdmin', phone: '+998930951996', password: 'primegameclub' },
  { labelKey: 'demoSuper', phone: '+998900000000', password: 'super123' },
]

const dest: Record<Role, string> = {
  user: '/home',
  admin: '/admin',
  superadmin: '/superadmin',
}

export default function LoginPage() {
  const { login, registerVerified, showNotification, currentUser, hydrated, t, language } =
    useApp()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hydrated && currentUser) router.replace(dest[currentUser.role])
  }, [hydrated, currentUser, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let res: Response | null = null
      let data: { ok?: boolean; error?: string; message?: string; user?: { name?: string; phone?: string } } = {}

      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            pin: password,
            lang: language,
            initData: getTelegramInitData(),
          }),
        })
        data = await res.json().catch(() => ({}))
      } catch {
        res = null
      }

      // Botda ro'yxatdan o'tgan foydalanuvchi
      if (res?.ok && data.ok) {
        if (registerVerified(data.user?.name || t('guest'), data.user?.phone || phone)) {
          router.replace('/home')
          return
        }
      }

      // Demo/admin hisoblari lokal bazada saqlanadi
      const local = login(phone, password, true)
      if (local.success && local.role) {
        router.replace(dest[local.role])
        return
      }

      if (!res) {
        showNotification(t('errServer'), 'error')
        return
      }

      if (res.status === 429) {
        showNotification(t('errTooMany'), 'error')
        return
      }

      if (data.error === 'not_found') {
        showNotification(t('errNotFound'), 'error')
        return
      }

      if (data.error === 'pin_not_set') {
        showNotification(t('errPinNotSet'), 'error')
        return
      }

      if (data.error === 'wrong_pin') {
        showNotification(t('errInvalidCredentials'), 'error')
        return
      }

      showNotification(data.message || t('errLoginFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Demo tugmalari — bir bosishda to'g'ridan-to'g'ri kirish
  const quickLogin = (demo: (typeof DEMO)[number]) => {
    setPhone(demo.phone)
    setPassword(demo.password)

    const result = login(demo.phone, demo.password, true)
    if (result.success && result.role) {
      router.replace(dest[result.role])
      return
    }

    showNotification(t('demoNotFound'), 'error')
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
            {t('loginTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('loginSubtitle')}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
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
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">
                {t('password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={t('togglePassword')}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('checking') : t('login')}
            </Button>
          </form>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t('loginHint')}
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t('register')}
            </Link>
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('adminAccess')}
              </p>
              <span className="text-[11px] text-muted-foreground">{t('quickLogin')}</span>
            </div>
            <div className="flex flex-col gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.phone}
                  type="button"
                  onClick={() => quickLogin(d)}
                  className="group flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t(d.labelKey)}</span>
                    <span className="text-mono-num block text-xs text-muted-foreground">
                      {d.phone}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    {t('enter')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
