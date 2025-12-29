/**
 * Latency Evaluator
 *
 * Checks if response time is within acceptable budget.
 */

import { defineHeuristicEvaluator, passScore, partialScore, failScore } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

// Default latency thresholds in milliseconds
const EXCELLENT_LATENCY = 5000 // 5 seconds
const GOOD_LATENCY = 10000 // 10 seconds
const ACCEPTABLE_LATENCY = 20000 // 20 seconds
const MAX_LATENCY = 60000 // 60 seconds

export const latency = defineHeuristicEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'latency',
  description: 'Checks if response time is within acceptable budget',

  evaluate: ({ latencyMs }) => {
    if (latencyMs <= EXCELLENT_LATENCY) {
      return passScore(`Excellent latency: ${(latencyMs / 1000).toFixed(1)}s`, 1.0)
    }

    if (latencyMs <= GOOD_LATENCY) {
      return passScore(`Good latency: ${(latencyMs / 1000).toFixed(1)}s`, 0.9)
    }

    if (latencyMs <= ACCEPTABLE_LATENCY) {
      return partialScore(`Acceptable latency: ${(latencyMs / 1000).toFixed(1)}s`, 0.7)
    }

    if (latencyMs <= MAX_LATENCY) {
      return partialScore(`Slow response: ${(latencyMs / 1000).toFixed(1)}s`, 0.4)
    }

    return failScore(`Response too slow: ${(latencyMs / 1000).toFixed(1)}s (over 60s)`, 0.0)
  },
})
