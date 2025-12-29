# Evaluation Framework

A modular evaluation system for testing LLM behavior and output quality.

## Overview

```
src/evaluation/
├── core/           # Framework core (types, interfaces)
├── datasets/       # Test case definitions
├── evaluators/     # Heuristic and LLM-as-judge evaluators
├── executors/      # Test case executors
├── providers/      # External service integrations
├── suites/         # Pre-configured test suites
└── cli/            # Command-line interface
```

## Quick Start

```bash
# Run behavioral tests with console output
bun run eval behavioral --provider console

# Run quality tests with LangSmith tracking
bun run eval quality --provider langsmith

# Evaluate production traces (offline)
bun run eval traces --provider langsmith --limit 50

# Run all tests (fast mode, no LLM judges)
bun run eval all --provider console --fast

# Sync datasets to LangSmith
bun run eval:sync --provider langsmith

# List available providers
bun run eval --list-providers
```

## Test Suites

### Behavioral Tests

Tests **HOW** the model behaves.

- **Focus**: Tool usage, formatting, search-first behavior
- **Speed**: Fast (~30s for 11 cases)
- **Cost**: Low (mostly heuristic checks)

| Evaluator              | Type      | Description                      |
| ---------------------- | --------- | -------------------------------- |
| `toolUsage`            | Heuristic | Correct tool invocation          |
| `formatting`           | Heuristic | Response structure               |
| `searchFirst`          | Heuristic | Uses web_search before answering |
| `responseQuality`      | Heuristic | Non-empty, reasonable length     |
| `toolEfficiency`       | Heuristic | Appropriate tool call count      |
| `languageMatch`        | Heuristic | Matches user's language          |
| `errorRecovery`        | LLM Judge | Handles errors gracefully        |
| `personaConsistency`   | LLM Judge | Maintains persona                |
| `contextSummarization` | LLM Judge | Summarizes appropriately         |

### Quality Tests

Tests **WHAT** the model answers.

- **Focus**: Factual correctness, helpfulness, tool execution
- **Speed**: Slow (~5-10 min for 12 cases)
- **Cost**: Higher (real tool execution + LLM judges)

| Evaluator              | Type      | Description                 |
| ---------------------- | --------- | --------------------------- |
| `latency`              | Heuristic | Response time within budget |
| `tokenEfficiency`      | Heuristic | Token usage appropriate     |
| `answerQuality`        | LLM Judge | Overall quality score       |
| `faithfulness`         | LLM Judge | True to tool results        |
| `hallucination`        | LLM Judge | Detects made-up info        |
| `confidence`           | LLM Judge | Calibrated uncertainty      |
| `instructionFollowing` | LLM Judge | Follows user intent         |
| `toolDecision`         | LLM Judge | Correct tool choice         |
| `toolExecution`        | LLM Judge | Proper tool usage           |
| `journey`              | LLM Judge | Full conversation quality   |

### Trace Evaluation

Evaluates **production traces** without re-executing the model.

- **Focus**: Offline evaluation of real user interactions
- **Source**: Traces from LangSmith Observability
- **Speed**: Medium (depends on trace count)
- **Cost**: LLM judge costs only (no model execution)

---

## Source Tagging

The framework automatically tags traces to distinguish between **production** traffic and **evaluation** runs.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Request                        │
│  User chat → API → LangSmith trace                          │
│  Tags: ['production', 'chat']                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Evaluation Request                        │
│  bun run eval → Executor → API → LangSmith trace            │
│  Tags: ['evaluation', 'behavioral'] or ['evaluation', 'quality'] │
└─────────────────────────────────────────────────────────────┘
```

### Tag Convention

| Source          | Tags                           | Description            |
| --------------- | ------------------------------ | ---------------------- |
| Production      | `['production', 'chat']`       | Real user interactions |
| Behavioral eval | `['evaluation', 'behavioral']` | Behavioral test runs   |
| Quality eval    | `['evaluation', 'quality']`    | Quality test runs      |
| Custom          | `config.sourceTags`            | User-defined tags      |

### Filtering Traces

When fetching production traces, evaluation runs are **excluded by default**:

```typescript
// Default: excludes 'evaluation' tagged traces
const traces = await provider.fetchTraces({ limit: 50 })

// Include all traces (including evaluation)
const allTraces = await provider.fetchTraces({
  limit: 50,
  excludeTags: [], // Override default exclusion
})

// Only production traces with errors
const errors = await provider.fetchTraces({
  tags: ['production'],
  errorsOnly: true,
})
```

### Provider Implementation

| Provider             | Storage Location                                       | Filter Syntax                              |
| -------------------- | ------------------------------------------------------ | ------------------------------------------ |
| LangSmith            | `extra.metadata.source` + `extra.metadata.source_tags` | `eq(metadata_key, "source", "production")` |
| Console              | N/A (not stored)                                       | N/A                                        |
| PromptLayer (future) | TBD                                                    | TBD                                        |

**Note**: LangSmith SDK's `createRun()` TypeScript types don't include a `tags` field, so we store source information in `extra.metadata` which is fully supported.

### Custom Source Tags

Override default tags via `ExecutorConfig.sourceTags`:

```typescript
const config: ExecutorConfig = {
  backendUrl: 'http://localhost:3000',
  model: 'mistral',
  timeoutMs: 60000,
  sourceTags: ['evaluation', 'custom-suite', 'experiment-123'],
}
```

---

## CLI Reference

```
bun run eval <suite> --provider <name> [options]
```

### Suites

| Suite        | Description                          |
| ------------ | ------------------------------------ |
| `behavioral` | Test HOW the model behaves           |
| `quality`    | Test WHAT the model answers          |
| `traces`     | Evaluate production traces (offline) |
| `all`        | Run behavioral + quality             |

### Required Options

| Option             | Description                              |
| ------------------ | ---------------------------------------- |
| `--provider`, `-p` | Provider to use (`langsmith`, `console`) |

### General Options

| Option                   | Description                | Default              |
| ------------------------ | -------------------------- | -------------------- |
| `--model <id>`           | Model to evaluate          | `mistral-medium-3.1` |
| `--verbose`, `-v`        | Show detailed output       | `false`              |
| `--no-llm-judge`         | Skip LLM judges (faster)   | `false`              |
| `--fast`                 | Alias for `--no-llm-judge` | `false`              |
| `--list-providers`, `-l` | Show available providers   | -                    |
| `--help`, `-h`           | Show help                  | -                    |

### Trace Options

| Option            | Description                   | Default |
| ----------------- | ----------------------------- | ------- |
| `--limit <n>`     | Number of traces to fetch     | `50`    |
| `--since <hours>` | Only traces from last N hours | `24`    |
| `--errors-only`   | Only fetch error traces       | `false` |
| `--random`        | Random sample vs most recent  | `false` |

### Environment Variables

| Variable            | Description       | Default                               |
| ------------------- | ----------------- | ------------------------------------- |
| `EVAL_MODEL`        | Default model     | `mistral-medium-3.1`                  |
| `BACKEND_URL`       | Backend URL       | `http://localhost:3000`               |
| `LLM_JUDGE_MODEL`   | Judge model       | `anthropic:claude-3-5-haiku-20241022` |
| `LANGSMITH_API_KEY` | LangSmith API key | Required for langsmith                |
| `LANGSMITH_PROJECT` | LangSmith project | Required for traces                   |

### LLM Judge Models

```bash
# Anthropic (recommended)
LLM_JUDGE_MODEL=anthropic:claude-3-5-haiku-20241022   # Fast, cheap
LLM_JUDGE_MODEL=anthropic:claude-3-5-sonnet-20241022  # Balanced
LLM_JUDGE_MODEL=anthropic:claude-sonnet-4-20250514    # High quality

# OpenAI
LLM_JUDGE_MODEL=openai:gpt-4o-mini                    # Fast, cheap
LLM_JUDGE_MODEL=openai:gpt-4o                         # High quality
```

---

## Providers

### Console Provider

Outputs to terminal only. Always available.

```bash
bun run eval behavioral --provider console
```

**Capabilities**: Output only (no datasets, no traces)

### LangSmith Provider

Full integration with [LangSmith](https://smith.langchain.com).

```bash
export LANGSMITH_API_KEY=lsv2_...
export LANGSMITH_PROJECT=my-project

bun run eval behavioral --provider langsmith
bun run eval traces --provider langsmith --limit 100
```

**Capabilities**:

- ✅ Dataset sync
- ✅ Experiment tracking
- ✅ Score/feedback storage
- ✅ Trace fetching (production data)

---

## Adding a New Provider

### 1. Create Provider Directory

```bash
mkdir -p src/evaluation/providers/my-provider
```

### 2. Create Reporter (`reporter.ts`)

```typescript
import type { Reporter, TestResult } from '../../core'

export const createMyReporter = (options = {}): Reporter => ({
  name: 'my-provider',

  async onSuiteStart(suite, totalTests) {
    console.log(`Starting ${suite.name} with ${totalTests} tests`)
  },

  async onSuiteComplete(result) {
    console.log(`Done: ${result.summary.passed}/${result.summary.total} passed`)
  },

  onTestStart(testCase) {},

  async onTestComplete(result) {
    console.log(`${result.testCaseName}: ${result.passed ? '✓' : '✗'}`)
  },
})
```

### 3. Create Provider (`provider.ts`)

```typescript
import type { Provider, Reporter } from '../../core'
import type { ProviderOptions } from '../registry'
import { createMyReporter } from './reporter'

export class MyProvider implements Provider {
  readonly name = 'my-provider'
  readonly supportsTraces = false // Set true if you support trace fetching

  constructor(private options: ProviderOptions = {}) {}

  async initialize(): Promise<void> {
    // Connect to service
  }

  async dispose(): Promise<void> {
    // Clean up
  }

  createReporter(): Reporter {
    return createMyReporter(this.options)
  }

  // Optional: Implement if provider supports traces
  // async fetchTraces(options: TraceSampleOptions): Promise<TraceFetchResult> {}
}
```

### 4. Create Index (`index.ts`)

```typescript
export { MyProvider } from './provider'
export { createMyReporter } from './reporter'
```

### 5. Register in `registry.ts`

```typescript
export const registry: ProviderRegistration[] = [
  // ... existing providers ...
  {
    name: 'my-provider',
    description: 'My custom provider',
    requiredEnv: 'MY_PROVIDER_API_KEY',
    optionalEnv: ['MY_PROVIDER_PROJECT'],
    create: (opts) => {
      const { MyProvider } = require('./my-provider')
      return new MyProvider(opts)
    },
  },
]
```

### 6. Test

```bash
export MY_PROVIDER_API_KEY=...
bun run eval behavioral --provider my-provider
```

---

## Adding a New Evaluator

### Heuristic Evaluator

```typescript
import { defineHeuristicEvaluator, passScore, failScore } from '../../core'

export const myCheck = defineHeuristicEvaluator({
  name: 'myCheck',
  description: 'Checks something specific',

  evaluate({ output }) {
    if (/* condition */) return passScore('Good')
    return failScore('Bad')
  },
})
```

### LLM-as-Judge Evaluator

```typescript
import { defineLLMJudgeEvaluator } from '../../core'

export const myQuality = defineLLMJudgeEvaluator({
  name: 'myQuality',
  description: 'Evaluates quality',

  prompt: `Rate from 0.0 to 1.0:
User: {inputs}
Response: {outputs}`,

  formatContext({ output }) {
    return {
      inputs: output.question,
      outputs: output.answer,
    }
  },
})
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          CLI                                 │
│  bun run eval <suite> --provider <name>                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Suite Runner                             │
│  Orchestrates: Dataset → Executor → Evaluators → Reporter   │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│    Executor     │ │  Evaluators │ │    Reporter     │
│                 │ │             │ │                 │
│ single-turn     │ │ heuristic/  │ │ console/        │
│ multi-turn      │ │ llm-judge   │ │ langsmith       │
│ offline         │ │             │ │                 │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

### Data Sources

```
┌─────────────────────────────────────────────────────────────┐
│                     Static Datasets                          │
│  behavioral.ts, quality.ts (code-defined test cases)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Live execution
                    ┌───────────────┐
                    │   Executor    │
                    └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Production Traces                           │
│  LangSmith Observability → fetchTraces() → tracesToDataset()│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Offline (no re-execution)
                    ┌───────────────┐
                    │OfflineExecutor│
                    └───────────────┘
```

---

## Troubleshooting

### "Provider not configured"

```bash
bun run eval --list-providers
```

### Slow evaluations

```bash
bun run eval behavioral --provider console --fast
```

### No traces found

Ensure `LANGSMITH_PROJECT` is set and matches your project name.

### LLM judge errors

```bash
# For Anthropic judges
export ANTHROPIC_API_KEY=sk-...

# For OpenAI judges
export OPENAI_API_KEY=sk-...
```
