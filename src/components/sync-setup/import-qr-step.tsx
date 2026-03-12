import { Button } from '@/components/ui/button'
import { Loader2, QrCode } from 'lucide-react'

type ImportQrStepProps = {
  isVerifying: boolean
  onSimulateScan: () => void
}

export const ImportQrStep = ({ isVerifying, onSimulateScan }: ImportQrStepProps) => (
  <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">
      On your other device, go to Settings → Encryption → "Show transfer QR code". Then scan it with this device's
      camera.
    </p>

    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-12">
      {isVerifying ? (
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/50" />
      ) : (
        <QrCode className="h-12 w-12 text-muted-foreground/50" />
      )}
      <p className="text-sm text-muted-foreground mt-4">
        {isVerifying ? 'Processing QR code...' : 'Camera viewfinder placeholder'}
      </p>
    </div>

    <Button disabled={isVerifying} onClick={onSimulateScan}>
      {isVerifying ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        'Simulate successful scan'
      )}
    </Button>
  </div>
)
