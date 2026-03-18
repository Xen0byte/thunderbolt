import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

type ImportRecoveryKeyStepProps = {
  isVerifying: boolean
  onVerify: () => void
}

export const ImportRecoveryKeyStep = ({ isVerifying, onVerify }: ImportRecoveryKeyStepProps) => {
  const [recoveryKey, setRecoveryKey] = useState('')

  const isValid = recoveryKey.replace(/\s+/g, '').length === 64

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Paste the 64-character recovery key you saved when setting up encryption on another device.
      </p>

      <textarea
        className="w-full rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        rows={3}
        placeholder="Paste your recovery key here..."
        value={recoveryKey}
        onChange={(e) => setRecoveryKey(e.target.value)}
        disabled={isVerifying}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && isValid) {
            e.preventDefault()
            onVerify()
          }
        }}
      />

      <Button disabled={!isValid || isVerifying} onClick={onVerify}>
        {isVerifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify & Import'
        )}
      </Button>
    </div>
  )
}
