export interface TelegramLinkedUser {
  chatId: number
  phone: string
  name: string
  username?: string | null
  lang?: string | null
  pinHash?: string | null
  pinSalt?: string | null
  registeredAt?: string
}

export function upsertTelegramUser(input: {
  chatId: number
  phone: string
  name: string
  username?: string | null
  lang?: string | null
}): Promise<TelegramLinkedUser | null>
