/**
 * Formatting Evaluator
 *
 * Checks table usage, markdown compliance, response length, etc.
 */

import { defineHeuristicEvaluator, passScore, failScore, partialScore } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

export const formatting = defineHeuristicEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'formatting',
  description: 'Checks table usage, markdown compliance, and response length',

  evaluate: ({ output, testCase }) => {
    const expected = testCase.expected || {}
    const content = output.content

    // Check for table usage
    const hasTable = /\|.*\|.*\|/m.test(content) && content.includes('---')

    if (expected.shouldAvoidTables && hasTable) {
      return partialScore('Response contains a table when tables should be avoided', 0.5)
    }

    // Check response length if specified
    if (expected.maxResponseLength !== undefined) {
      if (content.length > expected.maxResponseLength) {
        const overagePercent = ((content.length - expected.maxResponseLength) / expected.maxResponseLength) * 100
        const score = Math.max(0, 1 - overagePercent / 100)
        return partialScore(
          `Response too long: ${content.length} > ${expected.maxResponseLength} (${overagePercent.toFixed(0)}% over)`,
          score,
        )
      }
    }

    return passScore('Formatting meets expectations')
  },
})
