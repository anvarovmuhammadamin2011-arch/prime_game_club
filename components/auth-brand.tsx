'use client'

import { useApp } from '@/context/app-context'
import { Gamepad2, Zap, Shield, Trophy } from 'lucide-react'

export function AuthBrand() {
  const { t } = useApp()

  const features = [
    { icon: Zap, title: t('brandFeature1'), desc: t('brandFeature1Desc') },
    { icon: Shield, title: t('brandFeature2'), desc: t('brandFeature2Desc') },
    { icon: Trophy, title: t('brandFeature3'), desc: t('brandFeature3Desc') },
  ]

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Gamepad2 className="h-6 w-6" />
        </span>
        <span className="font-heading text-xl font-bold tracking-tight">
          Prime Game Club
        </span>
      </div>

      <div className="relative space-y-6">
        <h2 className="font-heading text-4xl font-bold leading-tight text-balance">
          {t('brandHeadline')}
        </h2>
        <p className="max-w-md text-primary-foreground/80 text-pretty">
          {t('brandDesc')}
        </p>
        <ul className="space-y-4">
          {features.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">{f.title}</p>
                <p className="text-sm text-primary-foreground/70">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-sm text-primary-foreground/60">
        © 2026 Prime Game Club. {t('rights')}
      </p>
    </div>
  )
}
