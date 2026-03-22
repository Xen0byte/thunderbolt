import { ndJsonStream } from '@agentclientprotocol/sdk'
import type { InProcessStreamPair } from './types'

/**
 * Creates a pair of in-process streams for bidirectional ACP communication.
 * Uses TransformStream pairs to create an in-memory connection between
 * a client and agent running in the same JavaScript context.
 *
 * The client writes to clientStream.writable and reads from clientStream.readable.
 * The agent writes to agentStream.writable and reads from agentStream.readable.
 * Messages flow: client → agent and agent → client via the underlying TransformStream pipes.
 */
export const createInProcessStream = (): InProcessStreamPair => {
  const clientToAgent = new TransformStream<Uint8Array>()
  const agentToClient = new TransformStream<Uint8Array>()

  const clientStream = ndJsonStream(clientToAgent.writable, agentToClient.readable)
  const agentStream = ndJsonStream(agentToClient.writable, clientToAgent.readable)

  return { clientStream, agentStream }
}
