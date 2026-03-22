import { AgentSideConnection, ClientSideConnection, type Agent, type Stream } from '@agentclientprotocol/sdk'
import type { SessionUpdateHandler } from './types'

type CreateAcpClientOptions = {
  stream: Stream
  agentStream: Stream
  agentHandler: (conn: AgentSideConnection) => Agent
  onSessionUpdate: SessionUpdateHandler
}

/**
 * Creates an ACP client connected to an agent.
 * Sets up both client-side and agent-side connections over the provided streams.
 */
export const createAcpClient = (options: CreateAcpClientOptions): ClientSideConnection => {
  const { stream, agentStream, agentHandler, onSessionUpdate } = options

  // Agent connection is created as a side effect — it starts listening on the stream
  new AgentSideConnection(agentHandler, agentStream)

  return new ClientSideConnection(
    () => ({
      sessionUpdate: async (params) => {
        onSessionUpdate(params.update)
      },
      requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
    }),
    stream,
  )
}
