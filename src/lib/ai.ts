import * as schema from '@/db/schema'
import { Model, SaveMessagesFunction, Setting } from '@/types'
import { createDeepInfra } from '@ai-sdk/deepinfra'
import { createFireworks } from '@ai-sdk/fireworks'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { convertToModelMessages, extractReasoningMiddleware, LanguageModel, streamText, ToolInvocation, UIMessage, wrapLanguageModel } from 'ai'
import { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import { toolset } from './tools'

export type ToolInvocationWithResult<T = object> = ToolInvocation & {
  result: T
}

const user = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
}

const p1 = `
    You are a helpful executive assistant.
    
    The current date and time is ${new Date().toISOString()}.
  
    The current user is ${user.first_name} ${user.last_name} (${user.email}).

    You can use the available tools to answer the user's question.
    
    If you are unable to answer the user's question based on the available information, just say so. Do not make up an answer.

    Respond to the user's question in a helpful, concise and friendly manner. Always reply to the user in plain text - do not reply in markdown or mention JSON or anything about tools
`

export const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  // compatibility: 'compatible',
  apiKey: 'ollama',
})

type AiFetchStreamingResponseOptions = {
  db: SqliteRemoteDatabase<typeof schema>
  init: RequestInit
  saveMessages: SaveMessagesFunction
  model: Model
  settings: Setting[]
}

export const createModel = (modelConfig: Model): LanguageModel => {
  switch (modelConfig.provider) {
    case 'openai': {
      if (!modelConfig.apiKey) {
        throw new Error('No API key provided')
      }
      const openai = createOpenAI({
        apiKey: modelConfig.apiKey,
      })
      const model = openai(modelConfig.model)

      return model
    }
    case 'fireworks': {
      if (!modelConfig.apiKey) {
        throw new Error('No API key provided')
      }
      const fireworks = createFireworks({
        apiKey: modelConfig.apiKey,
      })

      const model = fireworks(modelConfig.model)

      return model as LanguageModel
    }
    case 'deepinfra': {
      if (!modelConfig.apiKey) {
        throw new Error('No API key provided')
      }
      const deepinfra = createDeepInfra({
        apiKey: modelConfig.apiKey,
      })

      // const model = deepinfra('meta-llama/Meta-Llama-3.1-70B-Instruct')
      const model = deepinfra(modelConfig.model)

      return model as LanguageModel
    }
    case 'openai_compatible': {
      if (!modelConfig.url) {
        throw new Error('No URL provided')
      }
      const openaiCompatible = createOpenAICompatible({
        name: 'custom',
        baseURL: modelConfig.url,
        apiKey: modelConfig.apiKey ?? undefined,
      })
      return openaiCompatible(modelConfig.model) as LanguageModel
    }
    default: {
      throw new Error(`Unsupported model provider: ${modelConfig.provider}`)
    }
  }
}

export const aiFetchStreamingResponse = async ({ db, init, saveMessages, model: modelConfig }: AiFetchStreamingResponseOptions) => {
  try {
    const baseModel = await createModel(modelConfig)

    const wrappedModel = wrapLanguageModel({
      model: baseModel,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })

    const model = wrappedModel

    const options = init as RequestInit & { body: string }
    const body = JSON.parse(options.body)

    const { messages, chatId } = body as { messages: UIMessage[]; chatId: string }

    await saveMessages({
      id: chatId,
      messages,
    })

    console.log('Using model', modelConfig.provider, modelConfig.model)

    const result = streamText({
      model,
      system: p1,
      messages: convertToModelMessages(messages),
      toolCallStreaming: true,
      tools: toolset,
      // continueUntil: hasToolCall('answer'),
      // continueUntil: maxSteps(5),

      // toolChoice: 'required',
    })

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    })
  } catch (error) {
    console.error('Error in aiFetchStreamingResponse:', error)
    throw error
  }
}
