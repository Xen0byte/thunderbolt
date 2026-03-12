import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

type SuccessStepProps = {
  onEnableSync: () => void
}

export const SuccessStep = ({ onEnableSync }: SuccessStepProps) => (
  <div className="flex flex-col items-center gap-6 py-8">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
      <CheckCircle2 className="h-8 w-8 text-green-500" />
    </div>
    <div className="text-center">
      <h3 className="text-lg font-semibold mb-1">Encryption key stored</h3>
      <p className="text-sm text-muted-foreground">Your data will be encrypted before syncing to the cloud.</p>
    </div>
    <Button className="w-full" onClick={onEnableSync}>
      Enable Sync
    </Button>
  </div>
)
