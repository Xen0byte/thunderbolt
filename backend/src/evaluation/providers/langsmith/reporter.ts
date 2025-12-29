/**
 * LangSmith Reporter (Fallback)
 *
 * Simple console reporter for cases when runEvaluation() is not used.
 * The main LangSmith integration uses evaluate() which handles all syncing.
 */

import type { Client } from 'langsmith'
import type { Reporter, SuiteInfo, SuiteResult, ExperimentRef } from '../../core'

type LangSmithReporterOptions = {
  client: Client
  experimentRef?: ExperimentRef
  verbose?: boolean
}

/**
 * Create a LangSmith fallback reporter
 *
 * Note: For full LangSmith integration, use provider.runEvaluation()
 * which uses LangSmith's evaluate() function for automatic syncing.
 */
export const createLangSmithReporter = (options: LangSmithReporterOptions): Reporter => {
  const { experimentRef, verbose = false } = options

  let completed = 0
  let total = 0

  return {
    name: 'langsmith',

    async onSuiteStart(suite, totalTests) {
      total = totalTests
      completed = 0

      console.log('')
      console.log('═'.repeat(60))
      console.log(`🧪 ${suite.name.toUpperCase()}`)
      console.log('═'.repeat(60))
      console.log(`Model: ${suite.model}`)
      console.log(`Tests: ${totalTests}`)
      console.log(`Evaluators: ${suite.evaluatorCount}`)
      console.log(`Provider: LangSmith`)
      if (experimentRef?.url) {
        console.log(`Dashboard: ${experimentRef.url}`)
      }
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

      if (summary.errored > 0) {
        console.log(`Errors: ${summary.errored}`)
      }

      if (experimentRef?.url) {
        console.log('')
        console.log(`📈 View in LangSmith: ${experimentRef.url}`)
      }

      console.log('')
    },

    onTestStart(testCase) {
      if (verbose) {
        console.log(`→ ${testCase.name}`)
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

    onEvalComplete(_testCase, evaluatorName, score) {
      if (verbose) {
        const icon = score.value >= 0.7 ? '🟢' : score.value >= 0.4 ? '🟡' : '🔴'
        console.log(`    ${icon} ${evaluatorName}: ${(score.value * 100).toFixed(0)}%`)
      }
    },
  }
}
