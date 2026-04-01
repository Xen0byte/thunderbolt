export type HaystackConfig = {
  apiKey: string
  baseUrl: string
  workspaceName: string
  pipelineName: string
  pipelineId: string
}

export type HaystackPipelineConfig = {
  slug: string
  name: string
  pipelineName: string
  pipelineId: string
  icon?: string
}

export type HaystackChatStreamRequest = {
  query: string
  sessionId: string
}

export type HaystackSessionResponse = {
  searchSessionId: string
}

export type { HaystackDocumentMeta, HaystackFile, HaystackReferenceMeta } from '../../../shared/haystack-types'

/**
 * Shape of a single result from the Deepset chat-stream SSE.
 */
export type DeepsetResultPayload = {
  answers: Array<{
    answer: string
    files: Array<{ id: string; name: string }>
    meta?: {
      _references?: Array<{
        document_position: number
        document_id: string
      }>
    }
  }>
  documents: Array<{
    id: string
    content: string
    score: number
    file: { id: string; name: string }
    meta?: { page_number?: number }
  }>
}

export type DeepsetSSEEvent =
  | { type: 'delta'; delta: string }
  | { type: 'result'; result: DeepsetResultPayload }
  | { type: 'error'; error: string }
  | { type: 'end' }
