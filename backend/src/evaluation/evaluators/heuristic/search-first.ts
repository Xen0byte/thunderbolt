/**
 * Search-First Evaluator
 *
 * Checks if search tools were called before generating factual content.
 */

import { defineHeuristicEvaluator, passScore, failScore } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

export const searchFirst = defineHeuristicEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'search_first',
  description: 'Checks if search tools were called before answering real-time queries',

  shouldSkip: ({ testCase }) => {
    const expected = testCase.expected || {}
    return !expected.shouldBeSearchFirst
  },

  evaluate: ({ output }) => {
    const searchTools = output.toolCalls.filter(
      (tc) =>
        tc.name.includes('search') ||
        tc.name.includes('web') ||
        tc.name.includes('fetch') ||
        tc.name.includes('browse'),
    )

    if (searchTools.length === 0) {
      return failScore('Expected search-first behavior but no search tools were called', 0)
    }

    return passScore(`Search-first behavior confirmed (${searchTools.length} search calls)`)
  },
})
