import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { useDrizzle } from '@/db/provider'
import { chatThreadsTable } from '@/db/schema'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { v7 as uuidv7 } from 'uuid'

export function HomeSidebar() {
  const navigate = useNavigate()
  const { db } = useDrizzle()
  const queryClient = useQueryClient()

  const { data: chatThreads = [] } = useQuery({
    queryKey: ['chatThreads'],
    queryFn: async () => {
      return db.select().from(chatThreadsTable).orderBy(chatThreadsTable.id)
    },
  })

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const chatThreadId = uuidv7()
      return db.insert(chatThreadsTable).values({ id: chatThreadId, title: 'New Chat' }).returning()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] })
      if (data && data[0]) {
        navigate(`/chats/${data[0].id}`)
      }
    },
  })

  const createNewChat = () => {
    createChatMutation.mutate()
  }

  return (
    <Sidebar>
      <div className="flex flex-col gap-4">
        <Button asChild variant="outline">
          <Link to="/settings/accounts">
            <Settings className="size-4" />
            Settings
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <Button onClick={createNewChat} variant="ghost" className="justify-start">
            New Chat
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link to="/ui-kit">UI Kit</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {chatThreads.map((thread) => (
            <Button key={thread.id} asChild variant="ghost" className="justify-start">
              <Link to={`/chats/${thread.id}`}>{thread.title}</Link>
            </Button>
          ))}
        </div>
      </div>
    </Sidebar>
  )
}
