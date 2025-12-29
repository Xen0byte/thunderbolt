#!/usr/bin/env bun
/**
 * Run evaluations
 *
 * Usage:
 *   bun run eval behavioral --provider console
 *   bun run eval quality --provider langsmith
 *   bun run eval traces --provider langsmith --limit 50
 */

import { runSuite, type Dataset } from '../core'
import { getProvider, printProviderStatus, registry } from '../providers'
import { createBehavioralSuite } from '../suites/behavioral'
import { createQualitySuite } from '../suites/quality'
import { tracesToDataset, filterValidTraces } from '../datasets'
import { offlineExecutor } from '../executors'
import type { OfflineInput } from '../executors/offline'
import type { QualityExpected } from '../evaluators/types'

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

const args = process.argv.slice(2)

const hasFlag = (flag: string): boolean => args.includes(flag)

const getOption = (flag: string): string | undefined => {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-') ? args[idx + 1] : undefined
}

const suiteType = args.find((arg) => !arg.startsWith('-'))

// =============================================================================
// HELP & PROVIDERS LIST
// =============================================================================

if (hasFlag('--list-providers') || hasFlag('-l')) {
  printProviderStatus()
  process.exit(0)
}

const HELP = `
Thunderbolt Evaluation System

Usage:
  bun run eval <suite> --provider <name> [options]

Suites:
  behavioral    Test HOW the model behaves (tool usage, formatting)
  quality       Test WHAT the model answers (correctness, helpfulness)
  traces        Evaluate production traces (offline, no re-execution)
  all           Run behavioral + quality suites

Required:
  --provider, -p <name>   Provider to use: ${registry.map((r) => r.name).join(', ')}

Options:
  --model <id>            Model to evaluate (default: mistral-medium-3.1)
  --verbose, -v           Show detailed output
  --no-llm-judge          Skip LLM-as-judge evaluators (faster, cheaper)
  --fast                  Alias for --no-llm-judge
  --list-providers, -l    Show available providers and their status

Trace Options (for 'traces' suite):
  --limit <n>             Number of traces to fetch (default: 50)
  --since <hours>         Only traces from the last N hours (default: 24)
  --errors-only           Only fetch traces with errors
  --random                Random sample instead of most recent

Examples:
  bun run eval behavioral --provider console
  bun run eval quality --provider langsmith --model gpt-oss-120b
  bun run eval traces --provider langsmith --limit 100 --since 48
  bun run eval all --provider langsmith --verbose --fast

Environment Variables:
  EVAL_MODEL              Default model (default: mistral-medium-3.1)
  BACKEND_URL             Backend URL (default: http://localhost:8000)
  LLM_JUDGE_MODEL         LLM judge model (default: anthropic:claude-3-5-haiku-20241022)
  LANGSMITH_API_KEY       Required for langsmith provider
  LANGSMITH_PROJECT       Required for trace fetching
`

const validSuites = ['behavioral', 'quality', 'traces', 'all']

if (hasFlag('--help') || hasFlag('-h') || !suiteType || !validSuites.includes(suiteType)) {
  console.log(HELP)
  process.exit(suiteType ? 1 : 0)
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const providerName = getOption('--provider') || getOption('-p')
const verbose = hasFlag('--verbose') || hasFlag('-v')
const skipLLMJudge = hasFlag('--no-llm-judge') || hasFlag('--fast')
const model = getOption('--model') || process.env.EVAL_MODEL || 'mistral-medium-3.1'
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

// Trace options
const traceLimit = parseInt(getOption('--limit') || '50', 10)
const traceSinceHours = parseInt(getOption('--since') || '24', 10)
const errorsOnly = hasFlag('--errors-only')
const randomSample = hasFlag('--random')

if (!providerName) {
  console.error('Error: --provider is required\n')
  console.error('Available providers:')
  registry.forEach((r) => console.error(`  ${r.name} - ${r.description}`))
  console.error('\nRun with --list-providers to check configuration status')
  process.exit(1)
}

/** Safely get provider or exit with error */
const getProviderOrExit = (name: string) => {
  try {
    return getProvider(name, { verbose })
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    console.error('\nRun with --list-providers to check configuration status')
    process.exit(1)
  }
}

// =============================================================================
// TRACE EVALUATION
// =============================================================================

/** Fetch and evaluate production traces */
const runTraceEvaluation = async (provider: Awaited<ReturnType<typeof getProviderOrExit>>) => {
  if (!provider.fetchTraces) {
    console.error(`Error: Provider "${providerName}" does not support trace fetching.`)
    console.error('Use a provider like "langsmith" that has observability features.')
    process.exit(1)
  }

  console.log(`\n📥 Fetching traces from ${providerName}...`)
  console.log(`   Limit: ${traceLimit}, Since: ${traceSinceHours}h ago`)
  if (errorsOnly) console.log('   Filter: errors only')
  if (randomSample) console.log('   Sampling: random')

  const since = new Date(Date.now() - traceSinceHours * 60 * 60 * 1000)

  const result = await provider.fetchTraces({
    limit: traceLimit,
    since,
    errorsOnly,
    random: randomSample,
  })

  if (result.traces.length === 0) {
    console.error('\n❌ No traces found matching the criteria.')
    process.exit(1)
  }

  console.log(`   Found ${result.traces.length} traces\n`)

  // Filter out invalid traces
  const validTraces = filterValidTraces(result.traces)
  if (validTraces.length < result.traces.length) {
    console.log(`   Filtered to ${validTraces.length} valid traces (excluded empty/error responses)\n`)
  }

  // Convert to dataset
  const dataset: Dataset<OfflineInput, QualityExpected> = tracesToDataset(
    validTraces,
    `production-traces-${new Date().toISOString().slice(0, 10)}`,
    `${validTraces.length} production traces from the last ${traceSinceHours}h`,
  )

  // Import quality evaluators for trace evaluation
  const { latency, tokenEfficiency } = await import('../evaluators/heuristic')
  const { answerQuality, faithfulness, hallucination, confidence } = await import('../evaluators/llm-judge')

  // Build evaluators list
  const evaluators = skipLLMJudge
    ? [latency, tokenEfficiency]
    : [latency, tokenEfficiency, answerQuality, faithfulness, hallucination, confidence]

  // Create suite for trace evaluation
  const suite = {
    name: 'Trace Evaluation',
    description: 'Offline evaluation of production traces',
    dataset,
    executor: offlineExecutor,
    evaluators,
    settings: {
      maxConcurrency: 1,
      timeoutMs: 60000,
      passThreshold: 0.6,
    },
  }

  const experimentRef = await provider.createExperiment?.(`traces-${model}`)

  await runSuite(suite, {
    model,
    backendUrl,
    reporter: provider.createReporter(experimentRef),
    skipLLMJudge,
    verbose,
  })
}

// =============================================================================
// MAIN
// =============================================================================

const main = async () => {
  const provider = getProviderOrExit(providerName)
  await provider.initialize()

  try {
    if (suiteType === 'traces') {
      await runTraceEvaluation(provider)
    } else {
      if (suiteType === 'behavioral' || suiteType === 'all') {
        const suite = createBehavioralSuite({ skipLLMJudge })

        // Use provider's native evaluation if available (e.g., LangSmith's evaluate())
        if (provider.runEvaluation) {
          await provider.runEvaluation({
            suiteName: suite.name,
            dataset: suite.dataset,
            executor: suite.executor,
            evaluators: suite.evaluators,
            model,
            backendUrl,
            verbose,
          })
        } else {
          // Fallback to generic runner (for console provider)
          await runSuite(suite, {
            model,
            backendUrl,
            reporter: provider.createReporter(),
            skipLLMJudge,
            verbose,
          })
        }
      }

      if (suiteType === 'quality' || suiteType === 'all') {
        const suite = createQualitySuite({ skipLLMJudge })

        if (provider.runEvaluation) {
          await provider.runEvaluation({
            suiteName: suite.name,
            dataset: suite.dataset,
            executor: suite.executor,
            evaluators: suite.evaluators,
            model,
            backendUrl,
            verbose,
          })
        } else {
          await runSuite(suite, {
            model,
            backendUrl,
            reporter: provider.createReporter(),
            skipLLMJudge,
            verbose,
          })
        }
      }
    }
  } catch (error) {
    console.error('\nEvaluation failed:', (error as Error).message)
    if (verbose) {
      console.error((error as Error).stack)
    }
    process.exit(1)
  } finally {
    await provider.dispose()
  }
}

main()
