'use client'

import { useEffect } from 'react'
import { useApp } from '@/context/app-context'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const config = {
  success: { icon: CheckCircle2, cls: 'border-success/40 text-success' },
  error: { icon: XCircle, cls: 'border-destructive/40 text-destructive' },
  warning: { icon: AlertTriangle, cls: 'border-warning/50 text-warning' },
  info: { icon: Info, cls: 'border-info/40 text-info' },
}

export function Notifications() {
  const { notifications, dismissNotification, t } = useApp()
  const current = notifications[0]

  // Bittadan ko'rsatamiz: navbatdagilar oldingisi yopilgach chiqadi.
  useEffect(() => {
    if (!current) return
    const delay = current.type === 'warning' ? 8000 : 3500
    const id = setTimeout(() => dismissNotification(current.id), delay)
    return () => clearTimeout(id)
  }, [current, dismissNotification])

  if (!current) return null

  const { icon: Icon, cls } = config[current.type]

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <div
        key={current.id}
        className={cn(
          'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-top-2',
          cls,
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="min-w-0 flex-1 text-card-foreground">{current.message}</span>
        <button
          onClick={() => dismissNotification(current.id)}
          className="-mr-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={t('close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
