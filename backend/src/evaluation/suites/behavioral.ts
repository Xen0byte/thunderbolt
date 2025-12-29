/**
 * Behavioral Test Suite
 *
 * Tests HOW the model behaves:
 * - Tool invocation accuracy
 * - Response formatting
 * - Search-first behavior
 * - Persona consistency
 *
 * ⏱️ Fast (~30s), 💰 Low cost (mostly heuristics)
 */

import { defineSuite, type SuiteConfig, type Evaluator } from '../core'
import { singleTurnExecutor } from '../executors'
import { behavioralDataset } from '../datasets'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../evaluators/types'

// Heuristic evaluators
import {
  toolUsage,
  formatting,
  searchFirst,
  responseQuality,
  toolEfficiency,
  languageMatch,
} from '../evaluators/heuristic'

// LLM-as-judge evaluators
import { errorRecovery, personaConsistency, contextSummarization } from '../evaluators/llm-judge'

/**
 * All behavioral evaluators (heuristic + LLM-judge)
 */
const allEvaluators: Evaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>[] = [
  // Heuristic (fast, free)
  toolUsage,
  formatting,
  searchFirst,
  responseQuality,
  toolEfficiency,
  languageMatch,
  // LLM-as-judge (slower, costs $)
  errorRecovery,
  personaConsistency,
  contextSummarization,
]

/**
 * Heuristic-only evaluators (for --no-llm-judge mode)
 */
const heuristicOnlyEvaluators: Evaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>[] = [
  toolUsage,
  formatting,
  searchFirst,
  responseQuality,
  toolEfficiency,
  languageMatch,
]

/**
 * Create the behavioral test suite
 */
export const createBehavioralSuite = (options: {
  skipLLMJudge?: boolean
}): SuiteConfig<BehavioralInput, BehavioralOutput, ExpectedBehavior> => {
  const evaluators = options.skipLLMJudge ? heuristicOnlyEvaluators : allEvaluators

  return defineSuite({
    name: 'Behavioral Evaluation',
    description: 'Tests HOW the model behaves: tool usage, formatting, search-first behavior',
    dataset: behavioralDataset,
    executor: singleTurnExecutor,
    evaluators,
    settings: {
      maxConcurrency: 2,
      timeoutMs: 60000,
      passThreshold: 0.7,
    },
  })
}

/**
 * Default behavioral suite (includes LLM-as-judge)
 */
export const behavioralSuite = createBehavioralSuite({ skipLLMJudge: false })

/**
 * Fast behavioral suite (heuristics only)
 */
export const behavioralSuiteFast = createBehavioralSuite({ skipLLMJudge: true })
