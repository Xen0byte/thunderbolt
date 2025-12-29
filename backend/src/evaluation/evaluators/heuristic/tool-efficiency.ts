/**
 * Tool Efficiency Evaluator
 *
 * Checks if the model uses an appropriate number of tool calls.
 */

import { defineHeuristicEvaluator, passScore, partialScore, failScore } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

export const toolEfficiency = defineHeuristicEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'tool_efficiency',
  description: 'Checks if tool call count is within efficient range (1-5)',

  evaluate: ({ output }) => {
    const toolCount = output.toolCalls.length

    // No tools used - could be appropriate
    if (toolCount === 0) {
      return passScore('No tools used (may be appropriate for this query)')
    }

    // Ideal range: 1-5 tool calls
    if (toolCount >= 1 && toolCount <= 5) {
      return passScore(`Efficient tool usage: ${toolCount} calls (within 1-5 target)`)
    }

    // Slightly over: 6-8 calls
    if (toolCount <= 8) {
      return partialScore(`Acceptable tool usage: ${toolCount} calls (slightly over 5 target)`, 0.7)
    }

    // Too many: 9+ calls
    const penalty = Math.min(0.5, (toolCount - 8) * 0.1)
    const score = Math.max(0.2, 0.7 - penalty)
    return failScore(`Excessive tool usage: ${toolCount} calls (target is 1-5)`, score)
  },
})
