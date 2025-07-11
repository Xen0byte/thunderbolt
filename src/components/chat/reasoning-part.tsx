import type { ReasoningUIPart } from 'ai'
import { Check, Loader2 } from 'lucide-react'
import { Expandable } from '../ui/expandable'

interface ReasoningPartProps {
  part: ReasoningUIPart
  isStreaming: boolean
}

export const ReasoningPart = ({ part, isStreaming }: ReasoningPartProps) => {
  return (
    <Expandable
      title={<span className="text-secondary-foreground">Reasoning</span>}
      bgColor="bg-secondary"
      icon={
        isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
        ) : (
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        )
      }
      defaultOpen={false}
    >
      <div className="text-secondary-foreground leading-relaxed text-sm">{part.text}</div>
    </Expandable>
  )
}
