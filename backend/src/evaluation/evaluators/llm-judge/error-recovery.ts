/**
 * Error Recovery Evaluator (LLM-as-Judge)
 *
 * Evaluates how well the assistant handles tool failures or errors.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

const PROMPT = `You are evaluating how an AI assistant handles tool failures or errors.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Error Detection**: Did the assistant acknowledge when a tool failed?
2. **Graceful Degradation**: Did it provide a helpful response despite the error?
3. **No Hallucination**: Did it avoid making up information to cover for the failure?
4. **User Communication**: Did it clearly communicate limitations to the user?
5. **Alternative Suggestions**: Did it suggest alternatives or next steps?

## Scoring Guide
- 1.0: Excellent error handling (acknowledged, provided alternatives, helpful)
- 0.7-0.9: Good handling (acknowledged error, still provided value)
- 0.4-0.6: Partial handling (some issues but didn't completely fail)
- 0.0-0.3: Poor handling (ignored error, hallucinated, or unhelpful)

If there were NO errors/failures in the interaction, score 1.0.`

export const errorRecovery = defineLLMJudgeEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'error_recovery',
  description: 'Evaluates how well the assistant handles tool failures',
  prompt: PROMPT,

  formatContext: ({ output, testCase }) => {
    const query = testCase.input.question || testCase.input.messages?.[0]?.content || ''

    const inputs = `USER QUERY: ${query}

TOOL CALLS MADE: ${output.toolCalls.map((tc) => tc.name).join(', ') || 'None'}`

    const outputs = `ASSISTANT RESPONSE:
${output.content}`

    return { inputs, outputs }
  },
})
