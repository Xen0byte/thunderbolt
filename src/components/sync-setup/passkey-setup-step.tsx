import { Button } from '@/components/ui/button'
import { Fingerprint, Loader2 } from 'lucide-react'

type PasskeySetupStepProps = {
  isRegistering: boolean
  onSetupPasskey: () => void
  onSkip: () => void
}

export const PasskeySetupStep = ({ isRegistering, onSetupPasskey, onSkip }: PasskeySetupStepProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Fingerprint className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Protect your encryption key with a passkey (Face ID, Touch ID, or security key). Your key will be locked when
        the app is closed and must be unlocked each session.
      </p>
    </div>

    <Button disabled={isRegistering} onClick={onSetupPasskey}>
      {isRegistering ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Setting up passkey...
        </>
      ) : (
        <>
          <Fingerprint className="h-4 w-4" />
          Set up passkey
        </>
      )}
    </Button>

    <Button variant="ghost" disabled={isRegistering} onClick={onSkip}>
      Skip for now
    </Button>
  </div>
)
