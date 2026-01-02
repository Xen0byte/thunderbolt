# PromptLayer Observability

PromptLayer integration for logging, monitoring, and evaluating LLM conversations.

## Overview

This integration wraps the OpenAI SDK to automatically log all LLM requests to PromptLayer. It provides:

- **Automatic request logging** - All requests/responses captured
- **Multi-turn conversation grouping** - Related requests linked together
- **Tagging** - Categorize requests for filtering (provider, conversation ID)
- **Evaluation support** - Run evaluations via PromptLayer UI

## Setup

### 1. Get API Key

1. Sign up at [promptlayer.com](https://promptlayer.com)
2. Go to Settings → API Keys
3. Create a new API key

### 2. Configure Environment

Add to your `.env` file:

```bash
PROMPTLAYER_API_KEY=pl_xxxxxxxxxxxxxxxx
```

That's it! The integration activates automatically when the API key is present.

## How It Works

### Request Logging

All requests through the backend are logged after the response completes:

```
Frontend → Backend → LLM Provider
                ↓
         Response streams back
                ↓
         PromptLayer.logRequest() (async, non-blocking)
                ↓
         PromptLayer Dashboard
```

This approach works with **ANY** provider (Thunderbolt, Mistral, Anthropic) because we manually log after each request completes, rather than relying on SDK interception.

### Conversation Tracking

Multi-turn conversations are tracked using:

1. **Tags** - Each request tagged with `conversation:{id}` and `turn:{number}`
2. **Groups** - Related requests linked via PromptLayer Groups

To enable conversation tracking, include these headers from your frontend:

```typescript
// In your fetch call to the backend
headers: {
  'X-Conversation-Id': 'unique-conversation-id',
  'X-Turn-Number': '1'  // Increment for each turn
}
```

### Supported Providers

All providers routed through the backend are automatically logged:

| Provider    | Models                                  | Logged |
| ----------- | --------------------------------------- | ------ |
| Thunderbolt | `gpt-oss-120b`                          | ✅     |
| Mistral     | `mistral-medium-3.1`, `mistral-large-3` | ✅     |
| Anthropic   | `sonnet-4.5`                            | ✅     |

## Running Evaluations

### Programmatic Quality Evaluation (LLM-as-Judge)

Run quality evaluations on your datasets using the CLI:

```bash
# List available datasets
bun run eval --list-datasets

# Run quality evaluation on a dataset
bun run eval --dataset <dataset_id>

# Run with a custom name
bun run eval --dataset <dataset_id> --name "Production Quality Check"
```

**Quality Evaluators** (LLM-as-Judge):

- **Answer Quality** - Is the response accurate, helpful, and well-structured?
- **Faithfulness** - Does the response stick to facts without making things up?
- **No Hallucination** - Does the response avoid fabricated information?
- **Appropriate Confidence** - Does the response express appropriate uncertainty?

### Programmatic API

```typescript
import { runQualityEvaluation, listDatasets } from '@/promptlayer/evaluation'

// List datasets
const datasets = await listDatasets()
console.log(datasets)

// Run evaluation
const result = await runQualityEvaluation(datasetGroupId, {
  name: 'My Evaluation',
  onProgress: (msg) => console.log(msg),
})

console.log(`Score: ${result.overallScore}%`)
```

### UI-Based Evaluation

1. Go to PromptLayer Dashboard → **Evaluations**
2. Create a new pipeline or use an existing one
3. Select your dataset
4. Add evaluation columns (LLM_ASSERTION for quality)
5. Run and view results

### Attaching Scores to Individual Requests

```typescript
import { trackScore, trackMetadata } from '@/promptlayer/client'

// After getting a PromptLayer request ID
await trackScore(requestId, 85, 'quality')
await trackMetadata(requestId, {
  user_feedback: 'helpful',
  session_type: 'support',
})
```

## Environment Variables

| Variable              | Required | Description              |
| --------------------- | -------- | ------------------------ |
| `PROMPTLAYER_API_KEY` | Yes      | Your PromptLayer API key |

## Debugging

### Check if PromptLayer is Active

```typescript
import { isPromptLayerConfigured } from '@/promptlayer/client'

console.log('PromptLayer active:', isPromptLayerConfigured())
```

### View Logs

Check the backend console for PromptLayer-related logs:

```
[PromptLayer] Failed to track group: <error>
```

### Dashboard

View all logged requests at: https://www.promptlayer.com/requests

## Comparison with Other Providers

| Feature                 | PromptLayer      | LangSmith   | Helicone    |
| ----------------------- | ---------------- | ----------- | ----------- |
| Auto-logging            | ✅ SDK wrapper   | ✅ SDK      | ✅ Proxy    |
| Conversation grouping   | ✅ Groups + Tags | ✅ Sessions | ✅ Sessions |
| Programmatic evaluation | ⚠️ Limited       | ✅ Full     | ❌          |
| UI-based evaluation     | ✅               | ✅          | ⚠️          |
| Score attachment        | ✅               | ✅          | ✅          |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  promptlayer/client.ts                                       │
│  └── logRequest()            → Log completed requests        │
│  └── trackScore()            → Attach scores to requests    │
│  └── trackGroup()            → Link requests in groups      │
│  └── createGroup()           → Create conversation groups   │
│                                                              │
│  utils/streaming.ts                                          │
│  └── Accumulates response content during streaming          │
│  └── Invokes callback with full response on completion      │
│                                                              │
│  inference/routes.ts                                         │
│  └── Parses X-Conversation-Id header                         │
│  └── Creates/retrieves groups for conversations              │
│  └── Logs to PromptLayer after stream completes              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
