/** Telefon raqamlarini bir formatga keltirish (client va server uchun) */

export function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 9) return `+998${digits}`
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`
  return `+${digits}`
}

/** Oxirgi 9 raqam — +998 90 123 45 67 va 90 123 45 67 bir xil hisoblanadi */
export const phoneKey = (raw: string) => normalizePhone(raw).replace(/\D/g, '').slice(-9)

export function maskPhone(phone: string): string {
  const d = normalizePhone(phone).replace(/\D/g, '')
  const last = d.slice(-4)
  return `+${d.slice(0, 3)} ** *** ${last.slice(0, 2)} ${last.slice(2)}`
}
