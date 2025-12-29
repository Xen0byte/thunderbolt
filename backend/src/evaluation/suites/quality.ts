/**
 * Quality Test Suite
 *
 * Tests WHAT the model answers:
 * - Factual correctness
 * - Helpfulness and completeness
 * - Conciseness and clarity
 * - Proper tool usage
 *
 * ⏱️ Slow (~5-10 min for 12 cases), 💰 Higher cost (real tools + LLM judges)
 */

import { defineSuite, type SuiteConfig, type Evaluator } from '../core'
import { multiTurnExecutor } from '../executors'
import { qualityDataset } from '../datasets'
import type { QualityInput, QualityOutput, QualityExpected } from '../evaluators/types'

// Heuristic evaluators
import { latency, tokenEfficiency } from '../evaluators/heuristic'

// LLM-as-judge evaluators
import {
  answerQuality,
  faithfulness,
  hallucination,
  confidence,
  instructionFollowing,
  toolDecision,
  toolExecution,
  journey,
} from '../evaluators/llm-judge'

/**
 * All quality evaluators (heuristic + LLM-judge)
 */
const allEvaluators: Evaluator<QualityInput, QualityOutput, QualityExpected>[] = [
  // Heuristic (fast, free)
  latency,
  tokenEfficiency,
  // LLM-as-judge (slower, costs $)
  answerQuality,
  faithfulness,
  hallucination,
  confidence,
  instructionFollowing,
  toolDecision,
  toolExecution,
  journey,
]

/**
 * Heuristic-only evaluators (for --no-llm-judge mode)
 */
const heuristicOnlyEvaluators: Evaluator<QualityInput, QualityOutput, QualityExpected>[] = [latency, tokenEfficiency]

/**
 * Create the quality test suite
 */
export const createQualitySuite = (options: {
  skipLLMJudge?: boolean
}): SuiteConfig<QualityInput, QualityOutput, QualityExpected> => {
  const evaluators = options.skipLLMJudge ? heuristicOnlyEvaluators : allEvaluators

  return defineSuite({
    name: 'Quality Evaluation',
    description: 'Tests WHAT the model answers: correctness, helpfulness, clarity',
    dataset: qualityDataset,
    executor: multiTurnExecutor,
    evaluators,
    settings: {
      maxConcurrency: 1, // Sequential for multi-turn stability
      timeoutMs: 120000, // 2 min per test
      passThreshold: 0.6,
    },
  })
}

/**
 * Default quality suite (includes LLM-as-judge)
 */
export const qualitySuite = createQualitySuite({ skipLLMJudge: false })

/**
 * Fast quality suite (heuristics only)
 */
export const qualitySuiteFast = createQualitySuite({ skipLLMJudge: true })
