/**
 * Response Quality Evaluator
 *
 * Basic heuristics for response quality (non-empty, no errors, substance).
 */

import { defineHeuristicEvaluator, passScore, failScore, partialScore } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

export const responseQuality = defineHeuristicEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'response_quality',
  description: 'Checks if response is non-empty, substantial, and not just apologies',

  evaluate: ({ output }) => {
    const content = output.content

    // Check for empty response
    if (!content || content.trim().length === 0) {
      return failScore('Response is empty', 0)
    }

    // Check for common error patterns
    const errorPatterns = [/i don't have access/i, /i cannot browse/i, /as an ai/i, /i don't have the ability/i]

    for (const pattern of errorPatterns) {
      if (pattern.test(content)) {
        return partialScore('Response contains capability limitation language', 0.3)
      }
    }

    // Basic quality heuristics
    const hasSubstance = content.length > 50
    const startsWithApology = /^(i'm sorry|i apologize|unfortunately)/i.test(content.trim())

    if (!hasSubstance) {
      return partialScore('Response lacks substance (too short)', 0.5)
    }

    if (startsWithApology) {
      return partialScore('Response starts with apology/limitation', 0.4)
    }

    return passScore('Response quality acceptable')
  },
})
