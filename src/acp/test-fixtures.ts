import type { Mode, Model } from '@/types'
import type { InferenceEvent, RunInference } from './types'

export const testModes: Mode[] = [
  {
    id: 'mode-chat',
    name: 'chat',
    label: 'Chat',
    icon: 'message-square',
    systemPrompt: 'You are a chat assistant',
    isDefault: 1,
    order: 0,
    deletedAt: null,
    defaultHash: null,
    userId: null,
  },
  {
    id: 'mode-search',
    name: 'search',
    label: 'Search',
    icon: 'globe',
    systemPrompt: 'You are a search assistant',
    isDefault: 0,
    order: 1,
    deletedAt: null,
    defaultHash: null,
    userId: null,
  },
  {
    id: 'mode-research',
    name: 'research',
    label: 'Research',
    icon: 'microscope',
    systemPrompt: 'You are a research assistant',
    isDefault: 0,
    order: 2,
    deletedAt: null,
    defaultHash: null,
    userId: null,
  },
]

export const testModels: Model[] = [
  {
    id: 'model-sonnet',
    name: 'Claude Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250514',
    enabled: 1,
    toolUsage: 1,
    isConfidential: 0,
    startWithReasoning: 0,
    supportsParallelToolCalls: 1,
    vendor: null,
    apiKey: null,
    url: null,
    contextWindow: null,
    isSystem: null,
    defaultHash: null,
    deletedAt: null,
    userId: null,
    description: null,
  },
  {
    id: 'model-gpt',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: 1,
    toolUsage: 1,
    isConfidential: 0,
    startWithReasoning: 0,
    supportsParallelToolCalls: 1,
    vendor: null,
    apiKey: null,
    url: null,
    contextWindow: null,
    isSystem: null,
    defaultHash: null,
    deletedAt: null,
    userId: null,
    description: null,
  },
]

/**
 * Creates a mock inference function that yields the given events.
 */
export const createMockInference = (events: InferenceEvent[]): RunInference => {
  return async function* (_params) {
    for (const event of events) {
      yield event
    }
  }
}
