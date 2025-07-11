import { type TextUIPart } from 'ai'
import { StreamingMarkdown } from './streaming-markdown'

interface TextPartProps {
  part: TextUIPart
  isStreaming: boolean
}

export const TextPart = ({ part, isStreaming }: TextPartProps) => {
  return (
    <div className="space-y-2 p-4 rounded-md bg-secondary mr-auto w-full">
      <StreamingMarkdown
        content={(part as any).text || ''}
        isStreaming={isStreaming}
        className="text-secondary-foreground leading-relaxed"
      />
    </div>
  )
}
