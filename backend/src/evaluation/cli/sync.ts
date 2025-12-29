#!/usr/bin/env bun
/**
 * Sync datasets to a provider
 *
 * Usage:
 *   bun run eval:sync                    # Syncs to langsmith (default)
 *   bun run eval:sync --provider <name>  # Syncs to specific provider
 */

import { getProvider } from '../providers'
import { behavioralDataset, qualityDataset } from '../datasets'

const args = process.argv.slice(2)
const providerArg = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : undefined
const providerName = providerArg || 'langsmith'

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: bun run eval:sync [--provider <name>]

Syncs evaluation datasets to a provider that supports dataset storage.

Options:
  --provider <name>  Provider to sync to (default: langsmith)
  --help, -h         Show this help message

Providers that support datasets:
  - langsmith (requires LANGSMITH_API_KEY)
`)
  process.exit(0)
}

/** Safely get provider or exit with error */
const getProviderOrExit = (name: string) => {
  try {
    return getProvider(name)
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`)
    process.exit(1)
  }
}

const main = async () => {
  console.log(`\n📦 Syncing datasets to "${providerName}"...\n`)

  const provider = getProviderOrExit(providerName)

  if (!provider.syncDataset) {
    console.error(`❌ Provider "${providerName}" does not support dataset sync.`)
    console.error('   Use a provider like "langsmith" that supports datasets.')
    process.exit(1)
  }

  try {
    await provider.initialize()

    console.log('📚 Syncing behavioral dataset...')
    const behavioralRef = await provider.syncDataset(behavioralDataset)
    console.log(`   ✅ Synced ${behavioralDataset.cases.length} test cases`)
    console.log(`   ID: ${behavioralRef.id}`)

    console.log('\n📚 Syncing quality dataset...')
    const qualityRef = await provider.syncDataset(qualityDataset)
    console.log(`   ✅ Synced ${qualityDataset.cases.length} test cases`)
    console.log(`   ID: ${qualityRef.id}`)

    console.log('\n✅ All datasets synced successfully!')

    if (providerName === 'langsmith') {
      console.log('\n💡 View datasets at: https://smith.langchain.com/datasets')
    }
  } catch (error) {
    console.error('\n❌ Sync failed:', (error as Error).message)
    process.exit(1)
  } finally {
    await provider.dispose()
  }
}

main()
