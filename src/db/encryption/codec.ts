import { encrypt, decrypt, getCK } from '@/crypto'
import { isEncryptionEnabled } from './enabled'

export type EncryptionCodec = {
  encode: (plaintext: string) => Promise<string>
  decode: (ciphertext: string) => Promise<string>
}

const encPrefix = '__enc:'

/** AES-GCM codec using CK from IndexedDB. */
export const codec: EncryptionCodec = {
  encode: async (plaintext) => {
    if (!isEncryptionEnabled()) {
      return plaintext
    }
    const ck = await getCK()
    if (!ck) {
      return plaintext
    }
    const { iv, ciphertext } = await encrypt(plaintext, ck)
    return `${encPrefix}${iv}:${ciphertext}`
  },

  decode: async (encoded) => {
    if (!encoded.startsWith(encPrefix)) {
      return encoded
    }
    const ck = await getCK()
    if (!ck) {
      return encoded
    }
    const payload = encoded.slice(encPrefix.length)
    const separatorIdx = payload.indexOf(':')
    const iv = payload.slice(0, separatorIdx)
    const ciphertext = payload.slice(separatorIdx + 1)
    return decrypt({ iv, ciphertext }, ck)
  },
}
