/**
 * Evaluator Interface
 *
 * Defines the contract for all evaluators (heuristic and LLM-as-judge).
 */

import type { EvalScore, TestCase } from './types'

/**
 * Context provided to evaluators
 */
export type EvalContext<TInput = unknown, TOutput = unknown, TExpected = unknown> = {
  /** The test case being evaluated */
  testCase: TestCase<TInput, TExpected>
  /** Output from the executor */
  output: TOutput
  /** Execution latency in ms */
  latencyMs: number
}

/**
 * Evaluator type discriminator
 */
export type EvaluatorType = 'heuristic' | 'llm-judge'

/**
 * Evaluator interface
 */
export type Evaluator<TInput = unknown, TOutput = unknown, TExpected = unknown> = {
  /** Unique name for this evaluator */
  readonly name: string
  /** Human-readable description */
  readonly description: string
  /** Type of evaluator */
  readonly type: EvaluatorType

  /**
   * Evaluate the output and return a score
   */
  evaluate(ctx: EvalContext<TInput, TOutput, TExpected>): Promise<EvalScore> | EvalScore

  /**
   * Optional: determine if this evaluator should be skipped for a given context
   */
  shouldSkip?(ctx: EvalContext<TInput, TOutput, TExpected>): boolean
}

/**
 * Configuration for defining a heuristic evaluator
 */
export type HeuristicEvaluatorConfig<TInput, TOutput, TExpected> = {
  name: string
  description: string
  evaluate: (ctx: EvalContext<TInput, TOutput, TExpected>) => EvalScore
  shouldSkip?: (ctx: EvalContext<TInput, TOutput, TExpected>) => boolean
}

/**
 * Create a heuristic (rule-based) evaluator
 */
export const defineHeuristicEvaluator = <TInput = unknown, TOutput = unknown, TExpected = unknown>(
  config: HeuristicEvaluatorConfig<TInput, TOutput, TExpected>,
): Evaluator<TInput, TOutput, TExpected> => ({
  name: config.name,
  description: config.description,
  type: 'heuristic',
  evaluate: config.evaluate,
  shouldSkip: config.shouldSkip,
})

/**
 * Configuration for defining an LLM-as-judge evaluator
 */
export type LLMJudgeEvaluatorConfig<TInput, TOutput, TExpected> = {
  name: string
  description: string
  /** Prompt template for the LLM judge */
  prompt: string
  /** Override the default judge model */
  model?: string
  /** Function to format context for the prompt */
  formatContext: (ctx: EvalContext<TInput, TOutput, TExpected>) => { inputs: string; outputs: string }
  shouldSkip?: (ctx: EvalContext<TInput, TOutput, TExpected>) => boolean
}

/**
 * Get the LLM judge model from environment
 */
export const getJudgeModel = (): string => {
  return process.env.LLM_JUDGE_MODEL || 'anthropic:claude-3-5-haiku-20241022'
}

/**
 * Score choices for continuous scoring (0.0 to 1.0)
 */
export const SCORE_CHOICES = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

/**
 * Create an LLM-as-judge evaluator
 *
 * Uses openevals library for consistent LLM evaluation
 */
export const defineLLMJudgeEvaluator = <TInput = unknown, TOutput = unknown, TExpected = unknown>(
  config: LLMJudgeEvaluatorConfig<TInput, TOutput, TExpected>,
): Evaluator<TInput, TOutput, TExpected> => {
  // Lazy import to avoid loading openevals until needed
  let createLLMAsJudge: typeof import('openevals').createLLMAsJudge | null = null

  return {
    name: config.name,
    description: config.description,
    type: 'llm-judge',
    shouldSkip: config.shouldSkip,

    async evaluate(ctx) {
      // Lazy load openevals
      if (!createLLMAsJudge) {
        const openevals = await import('openevals')
        createLLMAsJudge = openevals.createLLMAsJudge
      }

      const model = config.model || getJudgeModel()
      const { inputs, outputs } = config.formatContext(ctx)

      const evaluator = createLLMAsJudge({
        prompt: config.prompt,
        model,
        choices: SCORE_CHOICES,
      })

      const result = await evaluator({ inputs, outputs })

      // Handle openevals score (can be number or boolean)
      const rawScore = result.score
      const score = typeof rawScore === 'number' ? rawScore : rawScore ? 1.0 : 0.0

      return {
        value: score,
        passed: score >= 0.5,
        reasoning: result.comment || 'No reasoning provided',
        metadata: { model },
      }
    },
  }
}

/**
 * Helper to create a passing score
 */
export const passScore = (reasoning: string, value = 1.0): EvalScore => ({
  value,
  passed: true,
  reasoning,
})

/**
 * Helper to create a failing score
 */
export const failScore = (reasoning: string, value = 0.0): EvalScore => ({
  value,
  passed: false,
  reasoning,
})

/**
 * Helper to create a partial score
 */
export const partialScore = (reasoning: string, value: number): EvalScore => ({
  value,
  passed: value >= 0.5,
  reasoning,
})
