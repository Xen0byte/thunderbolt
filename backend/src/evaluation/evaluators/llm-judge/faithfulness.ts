/**
 * Faithfulness Evaluator (LLM-as-Judge)
 *
 * Evaluates if the answer accurately reflects tool results without adding unsupported claims.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating whether an AI assistant's response is faithful to the tool results it received.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Accurate Representation**: Does the response accurately represent information from tool results?
2. **No Additions**: Does the response avoid adding information not present in tool results?
3. **No Contradictions**: Does the response avoid contradicting tool results?
4. **Appropriate Attribution**: Are claims properly attributed to their sources?

## Scoring Guide
- 1.0: Completely faithful to tool results
- 0.7-0.9: Mostly faithful with minor additions/paraphrasing
- 0.4-0.6: Some unsupported claims but core is faithful
- 0.0-0.3: Significant additions or contradictions to tool results

If NO tools were used, evaluate whether the response stays within training knowledge bounds.`

export const faithfulness = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'faithfulness',
  description: 'Evaluates if the answer accurately reflects tool results',
  prompt: PROMPT,

  shouldSkip: ({ output }) => !output.answer?.trim(),

  formatContext: ({ output, testCase }) => {
    const toolResults =
      output.toolCalls.length > 0
        ? output.toolCalls
            .map((t, i) => {
              const resultPreview = t.result.length > 800 ? t.result.slice(0, 800) + '... [truncated]' : t.result
              return `Tool ${i + 1} (${t.tool}): ${resultPreview}`
            })
            .join('\n\n')
        : 'No tools were used'

    const inputs = `USER QUESTION: ${testCase.input.question}

TOOL RESULTS:
${toolResults}`

    const outputs = `ASSISTANT RESPONSE:
${output.answer}`

    return { inputs, outputs }
  },
})
