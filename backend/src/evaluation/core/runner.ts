/**
 * Suite Runner
 *
 * Orchestrates test execution, evaluation, and reporting.
 */

import type { TestCase, TestResult, SuiteResult, ExecutorConfig, EvalScore } from './types'
import type { Evaluator, EvalContext } from './evaluator'
import type { Executor, ExecutionResult } from './executor'
import type { Reporter, SuiteInfo } from './reporter'
import type { Dataset } from './types'

export type SuiteConfig<TInput = unknown, TOutput = unknown, TExpected = unknown> = {
  name: string
  description?: string
  dataset: Dataset<TInput, TExpected>
  executor: Executor<TInput, TOutput>
  evaluators: Evaluator<TInput, TOutput, TExpected>[]
  settings?: {
    maxConcurrency?: number
    timeoutMs?: number
    passThreshold?: number
  }
}

export type RunOptions = {
  model: string
  backendUrl: string
  reporter: Reporter
  tags?: string[]
  testIds?: string[]
  skipLLMJudge?: boolean
  verbose?: boolean
}

export const defineSuite = <TInput = unknown, TOutput = unknown, TExpected = unknown>(
  config: SuiteConfig<TInput, TOutput, TExpected>,
): SuiteConfig<TInput, TOutput, TExpected> => config

/** Execute test and handle errors */
const safeExecute = async <TInput, TOutput>(
  executor: Executor<TInput, TOutput>,
  input: TInput,
  config: ExecutorConfig,
): Promise<ExecutionResult<TOutput> | { error: string }> => {
  try {
    return await executor.execute(input, config)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown execution error' }
  }
}

/** Filter test cases by tags and IDs */
const filterTestCases = <TInput, TExpected>(
  cases: TestCase<TInput, TExpected>[],
  tags?: string[],
  testIds?: string[],
): TestCase<TInput, TExpected>[] => {
  const filtered = tags?.length ? cases.filter((tc) => tc.tags?.some((t) => tags.includes(t))) : cases

  return testIds?.length ? filtered.filter((tc) => testIds.includes(tc.id)) : filtered
}

/** Filter evaluators based on options */
const filterEvaluators = <TInput, TOutput, TExpected>(
  evaluators: Evaluator<TInput, TOutput, TExpected>[],
  skipLLMJudge?: boolean,
): Evaluator<TInput, TOutput, TExpected>[] => {
  return skipLLMJudge ? evaluators.filter((e) => e.type !== 'llm-judge') : evaluators
}

/** Run a single test case */
const runTestCase = async <TInput, TOutput, TExpected>(
  testCase: TestCase<TInput, TExpected>,
  executor: Executor<TInput, TOutput>,
  evaluators: Evaluator<TInput, TOutput, TExpected>[],
  config: ExecutorConfig,
  reporter: Reporter,
  passThreshold: number,
): Promise<TestResult<TInput, TOutput>> => {
  reporter.onTestStart(testCase)

  const execResult = await safeExecute(executor, testCase.input, config)

  // Handle execution error
  if ('error' in execResult && !('output' in execResult)) {
    const result: TestResult<TInput, TOutput> = {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      input: testCase.input,
      output: {} as TOutput,
      scores: {},
      overallScore: 0,
      passed: false,
      latencyMs: 0,
      error: execResult.error,
    }
    await reporter.onTestComplete(result)
    return result
  }

  const ctx: EvalContext<TInput, TOutput, TExpected> = {
    testCase,
    output: execResult.output,
    latencyMs: execResult.latencyMs,
  }

  const scores: Record<string, EvalScore> = {}

  for (const evaluator of evaluators) {
    if (evaluator.shouldSkip?.(ctx)) continue

    reporter.onEvalStart?.(testCase, evaluator.name)

    try {
      const score = await evaluator.evaluate(ctx)
      scores[evaluator.name] = score
      reporter.onEvalComplete?.(testCase, evaluator.name, score)
    } catch (e) {
      const score: EvalScore = {
        value: 0,
        passed: false,
        reasoning: `Evaluator error: ${e instanceof Error ? e.message : 'Unknown'}`,
      }
      scores[evaluator.name] = score
      reporter.onEvalComplete?.(testCase, evaluator.name, score)
    }
  }

  const scoreValues = Object.values(scores).map((s) => s.value)
  const overallScore = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0

  const result: TestResult<TInput, TOutput> = {
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    input: testCase.input,
    output: execResult.output,
    scores,
    overallScore,
    passed: overallScore >= passThreshold,
    latencyMs: execResult.latencyMs,
    error: execResult.error,
  }

  await reporter.onTestComplete(result)
  return result
}

/** Calculate summary statistics from results */
const calculateSummary = <TInput, TOutput>(results: TestResult<TInput, TOutput>[], evaluatorNames: string[]) => {
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed && !r.error).length
  const errored = results.filter((r) => !!r.error).length
  const avgScore = total > 0 ? results.reduce((sum, r) => sum + r.overallScore, 0) / total : 0
  const avgLatencyMs = total > 0 ? results.reduce((sum, r) => sum + r.latencyMs, 0) / total : 0

  const scoresByEvaluator: Record<string, number> = {}
  for (const name of evaluatorNames) {
    const scores = results.map((r) => r.scores[name]?.value).filter((s): s is number => s !== undefined)
    if (scores.length > 0) {
      scoresByEvaluator[name] = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  return { total, passed, failed, errored, avgScore, avgLatencyMs, scoresByEvaluator }
}

/** Run a test suite */
export const runSuite = async <TInput, TOutput, TExpected>(
  suite: SuiteConfig<TInput, TOutput, TExpected>,
  options: RunOptions,
): Promise<SuiteResult<TInput, TOutput>> => {
  const { model, backendUrl, reporter, tags, testIds, skipLLMJudge } = options
  const { timeoutMs = 60000, passThreshold = 0.5 } = suite.settings || {}

  const testCases = filterTestCases(suite.dataset.cases, tags, testIds)
  const evaluators = filterEvaluators(suite.evaluators, skipLLMJudge)

  const config: ExecutorConfig = { backendUrl, model, timeoutMs }

  const suiteInfo: SuiteInfo = {
    name: suite.name,
    description: suite.description,
    model,
    evaluatorCount: evaluators.length,
    evaluatorNames: evaluators.map((e) => e.name),
  }

  await reporter.onSuiteStart(suiteInfo, testCases.length)

  const results: TestResult<TInput, TOutput>[] = []
  for (const testCase of testCases) {
    const result = await runTestCase(testCase, suite.executor, evaluators, config, reporter, passThreshold)
    results.push(result)
  }

  const summary = calculateSummary(
    results,
    evaluators.map((e) => e.name),
  )

  const suiteResult: SuiteResult<TInput, TOutput> = {
    suiteName: suite.name,
    timestamp: new Date(),
    model,
    provider: reporter.name,
    results,
    summary,
  }

  await reporter.onSuiteComplete(suiteResult)
  return suiteResult
}
