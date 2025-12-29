/**
 * Behavioral Evaluation Dataset
 *
 * Test cases for HOW the model behaves:
 * - Tool invocation accuracy
 * - Response formatting
 * - Search-first behavior
 */

import type { Dataset } from '../core'
import type { BehavioralInput, ExpectedBehavior } from '../evaluators/types'

export type BehavioralTestCase = {
  id: string
  name: string
  description?: string
  input: BehavioralInput
  expected: ExpectedBehavior
  tags?: string[]
}

const cases: BehavioralTestCase[] = [
  // Tool invocation cases
  {
    id: 'beh-tool-001',
    name: 'Current weather query',
    description: 'User asks about current weather - should use tools',
    input: { messages: [{ role: 'user', content: "What's the weather like in San Francisco right now?" }] },
    expected: {
      shouldUseTools: true,
      expectedToolCount: { min: 1, max: 3 },
      shouldAvoidTables: true,
      shouldBeSearchFirst: true,
    },
    tags: ['weather', 'current-info', 'tool-required'],
  },
  {
    id: 'beh-tool-002',
    name: 'Simple math calculation',
    description: 'User asks for math - should NOT use tools',
    input: { messages: [{ role: 'user', content: 'What is 15% of 250?' }] },
    expected: {
      shouldUseTools: false,
      shouldAvoidTables: true,
    },
    tags: ['math', 'no-tools'],
  },
  {
    id: 'beh-tool-003',
    name: 'Current news query',
    description: 'User asks about recent news - should use search tools',
    input: { messages: [{ role: 'user', content: 'What are the top news stories today?' }] },
    expected: {
      shouldUseTools: true,
      expectedToolCount: { min: 1, max: 5 },
      shouldAvoidTables: true,
      shouldBeSearchFirst: true,
    },
    tags: ['news', 'current-info', 'tool-required'],
  },
  {
    id: 'beh-tool-004',
    name: 'Code generation',
    description: 'User asks for code help - should NOT use search tools',
    input: { messages: [{ role: 'user', content: 'Write a Python function that reverses a string' }] },
    expected: {
      shouldUseTools: false,
      shouldAvoidTables: true,
    },
    tags: ['code', 'no-tools'],
  },
  {
    id: 'beh-tool-005',
    name: 'Product recommendation',
    description: 'User asks for product recommendations - should search',
    input: { messages: [{ role: 'user', content: 'What are the best wireless earbuds under $100?' }] },
    expected: {
      shouldUseTools: true,
      expectedToolCount: { min: 2, max: 6 },
      shouldAvoidTables: true,
      shouldBeSearchFirst: true,
    },
    tags: ['products', 'recommendations', 'tool-required'],
  },

  // Formatting cases
  {
    id: 'beh-fmt-001',
    name: 'Simple factual question',
    description: 'Response should be concise, no tables',
    input: { messages: [{ role: 'user', content: 'Who is the CEO of Apple?' }] },
    expected: {
      shouldUseTools: true,
      shouldAvoidTables: true,
      maxResponseLength: 500,
    },
    tags: ['factual', 'concise'],
  },
  {
    id: 'beh-fmt-002',
    name: 'Comparison request',
    description: 'Tables may be appropriate for comparisons',
    input: { messages: [{ role: 'user', content: 'Compare the specs of iPhone 15 vs Samsung S24' }] },
    expected: {
      shouldUseTools: true,
      shouldAvoidTables: false,
    },
    tags: ['comparison', 'products'],
  },
  {
    id: 'beh-fmt-003',
    name: 'Brief explanation request',
    description: 'Should give concise answer without over-explaining',
    input: { messages: [{ role: 'user', content: 'What does API stand for?' }] },
    expected: {
      shouldUseTools: false,
      shouldAvoidTables: true,
      maxResponseLength: 300,
    },
    tags: ['definition', 'concise'],
  },

  // Search-first cases
  {
    id: 'beh-search-001',
    name: 'Software version query',
    description: 'Should search for current version info',
    input: { messages: [{ role: 'user', content: "What's the latest version of Node.js?" }] },
    expected: {
      shouldUseTools: true,
      shouldBeSearchFirst: true,
      shouldAvoidTables: true,
    },
    tags: ['software', 'version', 'search-required'],
  },
  {
    id: 'beh-search-002',
    name: 'Historical fact',
    description: 'May not need search for well-established facts',
    input: { messages: [{ role: 'user', content: 'When did World War II end?' }] },
    expected: {
      shouldUseTools: false,
      shouldAvoidTables: true,
    },
    tags: ['history', 'factual'],
  },
  {
    id: 'beh-search-003',
    name: 'Current event query',
    description: 'Should definitely search for current events',
    input: { messages: [{ role: 'user', content: 'What happened in the stock market today?' }] },
    expected: {
      shouldUseTools: true,
      shouldBeSearchFirst: true,
      shouldAvoidTables: true,
    },
    tags: ['finance', 'current-info', 'search-required'],
  },

  // Complex research cases
  {
    id: 'beh-research-001',
    name: 'IPO document discovery',
    description: 'User asks where to find IPO filing documents',
    input: {
      messages: [
        {
          role: 'user',
          content:
            'Equipment Share (the company) is planning to go public. Where can I find the documents they have to publish to do so?',
        },
      ],
    },
    expected: {
      shouldUseTools: true,
      expectedToolCount: { min: 1, max: 5 },
      shouldBeSearchFirst: true,
      shouldAvoidTables: true,
    },
    tags: ['finance', 'ipo', 'search-required', 'research'],
  },
]

/**
 * Behavioral evaluation dataset
 */
export const behavioralDataset: Dataset<BehavioralInput, ExpectedBehavior> = {
  name: 'thunderbolt-behavioral',
  description: 'Tests HOW the model behaves: tool usage, formatting, search-first behavior',
  source: 'dataset',
  cases: cases.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    source: 'dataset' as const,
    input: c.input,
    expected: c.expected,
    tags: c.tags,
  })),
}

/**
 * Get cases by tag
 */
export const getBehavioralCasesByTag = (tag: string) => cases.filter((c) => c.tags?.includes(tag))
