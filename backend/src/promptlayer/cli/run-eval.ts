#!/usr/bin/env bun
/**
 * CLI for running PromptLayer quality evaluations
 *
 * Usage:
 *   bun run src/promptlayer/cli/run-eval.ts --dataset <id>
 *   bun run src/promptlayer/cli/run-eval.ts --list-datasets
 *
 * Options:
 *   --dataset <id>    Dataset group ID to evaluate
 *   --name <name>     Optional name for the evaluation
 *   --list-datasets   List available datasets
 *   --help            Show this help message
 */

import { runQualityEvaluation, listDatasets } from '../evaluation'

const args = process.argv.slice(2)

const hasFlag = (flag: string) => args.includes(flag)
const getFlagValue = (flag: string): string | undefined => {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined
}

const showHelp = () => {
  console.log(`
PromptLayer Quality Evaluation CLI

Usage:
  bun run src/promptlayer/cli/run-eval.ts --dataset <id>
  bun run src/promptlayer/cli/run-eval.ts --list-datasets

Options:
  --dataset <id>    Dataset group ID to evaluate
  --name <name>     Optional name for the evaluation
  --list-datasets   List available datasets
  --help            Show this help message

Environment Variables:
  PROMPTLAYER_API_KEY  Your PromptLayer API key (required)

Example:
  # List all datasets
  bun run src/promptlayer/cli/run-eval.ts --list-datasets

  # Run evaluation on dataset ID 123
  bun run src/promptlayer/cli/run-eval.ts --dataset 123

  # Run with a custom name
  bun run src/promptlayer/cli/run-eval.ts --dataset 123 --name "Production Quality Check"
`)
}

const main = async () => {
  if (hasFlag('--help') || args.length === 0) {
    showHelp()
    process.exit(0)
  }

  // Check for API key
  if (!process.env.PROMPTLAYER_API_KEY) {
    console.error('❌ Error: PROMPTLAYER_API_KEY environment variable is required')
    console.error('   Set it in your .env file or export it in your shell')
    process.exit(1)
  }

  // List datasets
  if (hasFlag('--list-datasets')) {
    console.log('\n📋 Fetching datasets from PromptLayer...\n')

    try {
      const datasets = await listDatasets()

      if (datasets.length === 0) {
        console.log('No datasets found. Create one in the PromptLayer dashboard first.')
        process.exit(0)
      }

      console.log('Available Datasets:')
      console.log('─'.repeat(70))
      console.log('  Group ID | Version | Name')
      console.log('─'.repeat(70))
      for (const dataset of datasets) {
        console.log(
          `  ${String(dataset.dataset_group_id).padEnd(8)} | v${String(dataset.version_number).padEnd(6)} | ${dataset.name}`,
        )
      }
      console.log('─'.repeat(70))
      console.log(`\nTotal: ${datasets.length} dataset(s)`)
      console.log('\nTo run an evaluation, use the Group ID:')
      console.log(`  bun run eval --dataset <group_id>`)
    } catch (error) {
      console.error('❌ Failed to list datasets:', (error as Error).message)
      process.exit(1)
    }

    process.exit(0)
  }

  // Run evaluation
  const datasetId = getFlagValue('--dataset')
  if (!datasetId) {
    console.error('❌ Error: --dataset <id> is required')
    console.error('   Use --list-datasets to see available datasets')
    process.exit(1)
  }

  const datasetGroupId = parseInt(datasetId, 10)
  if (isNaN(datasetGroupId)) {
    console.error('❌ Error: Dataset ID must be a number')
    process.exit(1)
  }

  const name = getFlagValue('--name')

  console.log('\n' + '═'.repeat(60))
  console.log('🧪 PROMPTLAYER QUALITY EVALUATION')
  console.log('═'.repeat(60))
  console.log(`Dataset ID: ${datasetGroupId}`)
  if (name) console.log(`Name: ${name}`)
  console.log('')

  try {
    const result = await runQualityEvaluation(datasetGroupId, {
      name,
      onProgress: (message) => console.log(`   ${message}`),
    })

    console.log('')
    console.log('═'.repeat(60))
    console.log('📊 RESULTS')
    console.log('═'.repeat(60))
    console.log(`Report ID: ${result.reportId}`)
    console.log(`Overall Score: ${result.overallScore}%`)
    console.log('')
    console.log('Details:')
    console.log(JSON.stringify(result.details, null, 2))
    console.log('')
    console.log('✅ Evaluation complete!')
    console.log('')
    console.log('View results in PromptLayer:')
    console.log(`   https://www.promptlayer.com/evaluations/${result.reportId}`)
  } catch (error) {
    console.error('\n❌ Evaluation failed:', (error as Error).message)
    process.exit(1)
  }
}

main()
