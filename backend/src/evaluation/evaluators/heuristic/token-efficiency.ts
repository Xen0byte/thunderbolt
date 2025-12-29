/**
 * Token Efficiency Evaluator
 *
 * Checks if response is appropriately sized (not too verbose, not too terse).
 */

import { defineHeuristicEvaluator, passScore, partialScore, failScore } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const MIN_RESPONSE_LENGTH = 50
const MAX_RESPONSE_LENGTH = 5000

/** Get ideal length range based on guidance */
const getLengthBounds = (guidance?: 'brief' | 'moderate' | 'detailed') => {
  if (guidance === 'brief') return { min: 50, max: 500 }
  if (guidance === 'detailed') return { min: 200, max: 4000 }
  return { min: 100, max: 2000 }
}

export const tokenEfficiency = defineHeuristicEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'token_efficiency',
  description: 'Checks if response is appropriately sized',

  evaluate: ({ output, testCase }) => {
    const answer = output.answer || ''
    const length = answer.length
    const { min, max } = getLengthBounds(testCase.expected?.lengthGuidance)

    if (length < MIN_RESPONSE_LENGTH) {
      return failScore(`Response too short: ${length} characters`, 0.2)
    }

    if (length >= min && length <= max) {
      return passScore(`Good response length: ${length} characters`)
    }

    if (length < min && length >= MIN_RESPONSE_LENGTH) {
      return partialScore(`Response slightly short: ${length} characters`, 0.7)
    }

    if (length > max && length <= MAX_RESPONSE_LENGTH) {
      return partialScore(`Response slightly verbose: ${length} characters`, 0.7)
    }

    return failScore(`Response too verbose: ${length} characters`, 0.3)
  },
})
