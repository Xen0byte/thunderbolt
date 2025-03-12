import { useDrizzle } from '@/db/provider'
import { chatMessagesTable } from '@/db/schema'
import { useSettings } from '@/settings/provider'
import { Message } from 'ai'
import { eq } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import Chat from './chat'

export default function ChatDetailPage() {
  const params = useParams()
  const { db } = useDrizzle()
  const settingsContext = useSettings()
  const [messages, setMessages] = useState<Message[] | null>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      if (!params.chatThreadId) return

      try {
        const chatMessages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chat_thread_id, params.chatThreadId)).orderBy(chatMessagesTable.id)

        const formattedMessages = chatMessages.map((message) => ({
          id: message.id,
          parts: message.parts,
          role: message.role,
          content: message.content,
          createdAt: new Date(message.id),
        }))

        setMessages(formattedMessages)
      } catch (error) {
        console.error('Error fetching messages:', error)
        setMessages(null)
      }
    }

    fetchMessages()
  }, [db, params.chatThreadId])

  const onFinish = async (response: { readonly messages: Array<Message> }) => {
    if (!params.chatThreadId) return

    const lastMessage = response.messages[response.messages.length - 1]
    await db.insert(chatMessagesTable).values({
      id: lastMessage.id,
      parts: lastMessage.parts || [],
      role: lastMessage.role,
      content: lastMessage.content,
      chat_thread_id: params.chatThreadId,
      model: 'gpt-4o',
      provider: 'openai',
    })
  }

  useEffect(() => {
    console.log('messages A', messages)
  }, [messages])

  return (
    <>
      <div className="h-full w-full">
        {messages ? <Chat apiKey={settingsContext.settings.models?.openai_api_key!} initialMessages={() => messages} onFinish={onFinish} /> : <div>Error loading chat</div>}
      </div>
    </>
  )
}
