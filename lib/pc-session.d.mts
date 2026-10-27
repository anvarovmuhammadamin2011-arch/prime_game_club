export interface PcSessionWindow {
  start: string
  end: string
}

export function localDateStr(date?: Date): string
export function formatClock(iso: string): string
export function buildPcSession(
  date: string,
  startTime: string,
  hours: number,
): PcSessionWindow | null
