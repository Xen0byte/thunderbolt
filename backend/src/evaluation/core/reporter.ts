/**
 * Reporter Interface
 *
 * Defines the contract for reporting evaluation progress and results.
 * Providers implement this to send results to their platforms.
 */

import type { EvalScore, TestCase, TestResult, SuiteResult } from './types'

/**
 * Suite configuration passed to reporters
 */
export type SuiteInfo = {
  name: string
  description?: string
  model: string
  evaluatorCount: number
  evaluatorNames: string[]
}

/**
 * Reporter interface
 */
export type Reporter = {
  /** Reporter name */
  readonly name: string

  /**
   * Called when a suite starts running
   */
  onSuiteStart(suite: SuiteInfo, totalTests: number): Promise<void>

  /**
   * Called when a suite completes
   */
  onSuiteComplete(result: SuiteResult): Promise<void>

  /**
   * Called when a test case starts
   */
  onTestStart(testCase: TestCase): void

  /**
   * Called when a test case completes
   */
  onTestComplete(result: TestResult): Promise<void>

  /**
   * Called when an individual evaluator starts (optional)
   */
  onEvalStart?(testCase: TestCase, evaluatorName: string): void

  /**
   * Called when an individual evaluator completes (optional)
   */
  onEvalComplete?(testCase: TestCase, evaluatorName: string, score: EvalScore): void
}

/**
 * Compose multiple reporters into one
 *
 * Useful for sending results to multiple destinations (e.g., console + LangSmith)
 */
export const composeReporters = (...reporters: Reporter[]): Reporter => ({
  name: 'composed',

  async onSuiteStart(suite, total) {
    await Promise.all(reporters.map((r) => r.onSuiteStart(suite, total)))
  },

  async onSuiteComplete(result) {
    await Promise.all(reporters.map((r) => r.onSuiteComplete(result)))
  },

  onTestStart(testCase) {
    reporters.forEach((r) => r.onTestStart(testCase))
  },

  async onTestComplete(result) {
    await Promise.all(reporters.map((r) => r.onTestComplete(result)))
  },

  onEvalStart(testCase, name) {
    reporters.forEach((r) => r.onEvalStart?.(testCase, name))
  },

  onEvalComplete(testCase, name, score) {
    reporters.forEach((r) => r.onEvalComplete?.(testCase, name, score))
  },
})
