import type { db as DbType } from '@/db/client'
import { encryptionSetup } from '@/db/schema'
import { eq } from 'drizzle-orm'

type KeyCanary = {
  version: string
  iv: string
  ciphertext: string
}

type EncryptionSetupRow = {
  canary: KeyCanary
  salt: string | null
}

/** Get the encryption setup (canary + salt) for a user. Returns null if not found. */
export const getEncryptionSetup = async (
  database: typeof DbType,
  userId: string,
): Promise<EncryptionSetupRow | null> => {
  const row = await database
    .select({
      canaryVersion: encryptionSetup.canaryVersion,
      canaryIv: encryptionSetup.canaryIv,
      canaryCiphertext: encryptionSetup.canaryCiphertext,
      salt: encryptionSetup.salt,
    })
    .from(encryptionSetup)
    .where(eq(encryptionSetup.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!row) {
    return null
  }

  return {
    canary: {
      version: row.canaryVersion,
      iv: row.canaryIv,
      ciphertext: row.canaryCiphertext,
    },
    salt: row.salt,
  }
}

/** Upsert the encryption setup for a user. */
export const upsertEncryptionSetup = async (
  database: typeof DbType,
  userId: string,
  canary: KeyCanary,
  salt?: string,
) =>
  database
    .insert(encryptionSetup)
    .values({
      userId,
      canaryVersion: canary.version,
      canaryIv: canary.iv,
      canaryCiphertext: canary.ciphertext,
      salt: salt ?? null,
    })
    .onConflictDoUpdate({
      target: encryptionSetup.userId,
      set: {
        canaryVersion: canary.version,
        canaryIv: canary.iv,
        canaryCiphertext: canary.ciphertext,
        salt: salt ?? null,
      },
    })
