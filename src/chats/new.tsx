import ChatUI from '@/components/chat/chat-ui'
import { aiFetchStreamingResponse } from '@/lib/ai'
import { useSettings } from '@/settings/provider'
import { useChat } from '@ai-sdk/react'

export default function ChatNewPage() {
  const settingsContext = useSettings()

  const chatHelpers = useChat({
    fetch: (_requestInfoOrUrl, init) => {
      const apiKey = settingsContext.settings.models?.openai_api_key

      if (!apiKey) {
        // @todo: show a toast
        throw new Error('No API key found')
      }

      if (!init) {
        throw new Error('No init object found')
      }

      return aiFetchStreamingResponse({
        apiKey,
        init,
        onFinish: (response) => {
          console.log('onFinish', response)
        },
      })
    },
    maxSteps: 5,
  })

  return (
    <div className="h-full w-full">
      <ChatUI chatHelpers={chatHelpers} />
    </div>
  )
}
