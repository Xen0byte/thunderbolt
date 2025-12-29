/**
 * Tool Usage Evaluator
 *
 * Checks if tools were used when expected and avoided when not needed.
 */

import { defineHeuristicEvaluator, passScore, failScore, partialScore } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

export const toolUsage = defineHeuristicEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'tool_usage',
  description: 'Checks if tools were used when expected and avoided when not needed',

  evaluate: ({ output, testCase }) => {
    const expected = testCase.expected || {}
    const toolCount = output.toolCalls.length
    const usedTools = toolCount > 0

    // Check if tool usage matches expectation
    if (expected.shouldUseTools && !usedTools) {
      return failScore('Expected tools to be used but none were called', 0)
    }

    if (expected.shouldUseTools === false && usedTools) {
      return partialScore(`Tools were used (${toolCount}) when not expected`, 0.3)
    }

    // Check tool count bounds if specified
    if (expected.expectedToolCount) {
      const { min, max } = expected.expectedToolCount
      if (min !== undefined && toolCount < min) {
        return partialScore(`Too few tool calls: ${toolCount} < ${min}`, 0.5)
      }
      if (max !== undefined && toolCount > max) {
        return partialScore(`Too many tool calls: ${toolCount} > ${max}`, 0.7)
      }
    }

    return passScore('Tool usage matches expectations')
  },
})
