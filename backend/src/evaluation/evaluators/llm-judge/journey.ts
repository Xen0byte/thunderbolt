/**
 * Journey Evaluator (LLM-as-Judge)
 *
 * Evaluates the efficiency of the conversation path (turns, latency, directness).
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating the efficiency of an AI assistant's conversation journey.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Directness**: Did the assistant take a direct path to the answer?
   - Minimal unnecessary back-and-forth
   - Efficient tool usage

2. **Turn Efficiency**: Were the number of turns appropriate?
   - Simple questions: 1-2 turns ideal
   - Complex questions: 3-5 turns acceptable
   - More than 5 turns often indicates inefficiency

3. **Information Gathering**: Did it gather the right information efficiently?
   - Not too few sources (missing info)
   - Not too many sources (wasting time)

4. **Time to Answer**: Was the response time reasonable given the task?
   - Simple questions should be fast
   - Complex research can take longer

## Scoring Guide
- 1.0: Highly efficient journey
- 0.7-0.9: Good efficiency with minor detours
- 0.4-0.6: Some inefficiencies but completed
- 0.0-0.3: Very inefficient or incomplete journey`

export const journey = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'journey',
  description: 'Evaluates the efficiency of the conversation path',
  prompt: PROMPT,

  formatContext: ({ output, testCase, latencyMs }) => {
    const expected = testCase.expected || {}

    const inputs = `USER QUESTION: ${testCase.input.question}

QUESTION COMPLEXITY:
- Requires current information: ${expected.requiresCurrentInfo ? 'Yes' : 'No'}
- Expected detail level: ${expected.lengthGuidance || 'moderate'}`

    const outputs = `JOURNEY STATISTICS:
- Total turns: ${output.turnCount}
- Tool calls: ${output.toolCalls.length}
- Total latency: ${(latencyMs / 1000).toFixed(1)}s
- Status: ${output.status}

TOOLS USED:
${output.toolCalls.map((t) => `- ${t.tool}`).join('\n') || 'None'}

FINAL ANSWER:
${output.answer || '(No answer provided)'}`

    return { inputs, outputs }
  },
})
