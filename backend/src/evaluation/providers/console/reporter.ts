/**
 * Console Reporter
 *
 * Reports evaluation progress and results to the console only.
 * No external sync - results are just printed.
 */

import type { Reporter, SuiteInfo, SuiteResult, TestCase, EvalScore } from '../../core'

type ConsoleReporterOptions = {
  verbose?: boolean
}

/**
 * Create a console-only reporter
 */
export const createConsoleReporter = (options: ConsoleReporterOptions = {}): Reporter => {
  const { verbose = false } = options

  let suiteInfo: SuiteInfo | null = null
  let completed = 0
  let total = 0

  return {
    name: 'console',

    async onSuiteStart(suite, totalTests) {
      suiteInfo = suite
      total = totalTests
      completed = 0

      console.log('')
      console.log('═'.repeat(60))
      console.log(`🧪 ${suite.name.toUpperCase()}`)
      console.log('═'.repeat(60))
      console.log(`Model: ${suite.model}`)
      console.log(`Tests: ${totalTests}`)
      console.log(`Evaluators: ${suite.evaluatorCount}`)
      console.log(`Provider: Console (no sync)`)
      console.log('')
    },

    async onSuiteComplete(result) {
      const { summary } = result

      console.log('')
      console.log('═'.repeat(60))
      console.log('📊 RESULTS')
      console.log('═'.repeat(60))
      console.log(
        `Passed: ${summary.passed}/${summary.total} (${((summary.passed / summary.total) * 100).toFixed(0)}%)`,
      )
      console.log(`Avg Score: ${(summary.avgScore * 100).toFixed(1)}%`)
      console.log(`Avg Latency: ${(summary.avgLatencyMs / 1000).toFixed(1)}s`)

      if (summary.errored > 0) {
        console.log(`Errors: ${summary.errored}`)
      }

      // Show per-evaluator scores
      console.log('')
      console.log('Scores by evaluator:')
      for (const [name, score] of Object.entries(summary.scoresByEvaluator)) {
        const icon = score >= 0.7 ? '🟢' : score >= 0.4 ? '🟡' : '🔴'
        console.log(`  ${icon} ${name}: ${(score * 100).toFixed(0)}%`)
      }

      console.log('')
    },

    onTestStart(testCase) {
      if (verbose) {
        console.log(`\n→ ${testCase.name}`)
      }
    },

    async onTestComplete(result) {
      completed++

      const statusIcon = result.error ? '❌' : result.passed ? '✅' : '⚠️'
      const latency = `${(result.latencyMs / 1000).toFixed(1)}s`

      console.log(`[${completed}/${total}] ${statusIcon} ${result.testCaseName} (${latency})`)

      if (verbose && result.error) {
        console.log(`    Error: ${result.error}`)
      }
    },

    onEvalStart(_testCase, evaluatorName) {
      if (verbose) {
        console.log(`    Evaluating: ${evaluatorName}...`)
      }
    },

    onEvalComplete(_testCase, evaluatorName, score) {
      if (verbose) {
        const icon = score.value >= 0.7 ? '🟢' : score.value >= 0.4 ? '🟡' : '🔴'
        console.log(`    ${icon} ${evaluatorName}: ${(score.value * 100).toFixed(0)}%`)
      }
    },
  }
}
