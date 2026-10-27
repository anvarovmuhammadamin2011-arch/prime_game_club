// PC sessiyasi vaqtini hisoblash. Sana/vaqt mahalliy vaqtda kiritiladi,
// saqlash uchun ISO (UTC) ga o'tkaziladi.

export function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatClock(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function buildPcSession(date, startTime, hours) {
  const day = date || localDateStr()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  if (!/^\d{2}:\d{2}$/.test(startTime)) return null

  const h = Number(hours)
  if (!Number.isFinite(h) || h <= 0 || h > 24) return null

  const start = new Date(`${day}T${startTime}:00`)
  if (Number.isNaN(start.getTime())) return null

  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + h * 3_600_000).toISOString(),
  }
}
