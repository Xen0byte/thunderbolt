import { z } from 'zod'

export const AccountSettingsSchema = z.object({
  hostname: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
})

export const ModelsSettingsSchema = z.object({
  openai_api_key: z.string().min(1),
})

export const SettingsSchema = z.object({
  account: AccountSettingsSchema.optional(),
  models: ModelsSettingsSchema.optional(),
})
