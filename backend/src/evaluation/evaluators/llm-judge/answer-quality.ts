/**
 * Answer Quality Evaluator (LLM-as-Judge)
 *
 * Evaluates the quality of the final answer: correctness, completeness, clarity.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating the quality of an AI assistant's final answer to a question.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Correctness** (most important):
   - Is the answer factually accurate?
   - Are there any errors or incorrect statements?

2. **Completeness**:
   - Does the answer address what was asked?
   - Is anything important missing?

3. **Clarity**:
   - Is the answer easy to understand?
   - Is it well-organized?

4. **Grounding** (if tool results were used):
   - Does the answer properly use information from tool results?
   - Does it make unsupported claims?

If there is NO final answer (empty), score 0.0.

Provide your reasoning, then assign a score from 0.0 to 1.0:
- 0.0-0.3: Poor (incorrect, incomplete, or unclear)
- 0.4-0.6: Acceptable (mostly correct but has issues)
- 0.7-0.9: Good (correct, complete, and clear)
- 1.0: Excellent (perfect answer)`

export const answerQuality = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'answer_quality',
  description: 'Evaluates correctness, completeness, and clarity of the answer',
  prompt: PROMPT,

  shouldSkip: ({ output }) => !output.answer?.trim(),

  formatContext: ({ output, testCase }) => {
    const toolResults =
      output.toolCalls.length > 0
        ? output.toolCalls
            .map((t, i) => {
              const resultPreview = t.result.length > 500 ? t.result.slice(0, 500) + '... [truncated]' : t.result
              return `Tool ${i + 1} (${t.tool}): ${resultPreview}`
            })
            .join('\n\n')
        : 'No tool results (answered from training data)'

    const inputs = `USER QUESTION: ${testCase.input.question}

TOOL RESULTS:
${toolResults}`

    const outputs = `FINAL ANSWER:
${output.answer}`

    return { inputs, outputs }
  },
})
