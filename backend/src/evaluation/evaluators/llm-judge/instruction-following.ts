/**
 * Instruction Following Evaluator (LLM-as-Judge)
 *
 * Evaluates if the model follows system prompt rules and user instructions.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating whether an AI assistant properly follows instructions.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Direct Response**: Does the response directly address what was asked?
2. **Format Compliance**: Does it follow any format requirements (lists, tables, etc.)?
3. **Constraint Adherence**: Does it respect constraints (word limits, specific focus areas)?
4. **No Tangents**: Does it stay on topic without unnecessary additions?
5. **Complete Coverage**: Does it cover all parts of multi-part questions?

## Scoring Guide
- 1.0: Perfectly follows all instructions
- 0.7-0.9: Mostly follows instructions with minor deviations
- 0.4-0.6: Partially follows instructions, some misses
- 0.0-0.3: Significantly deviates from instructions`

export const instructionFollowing = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'instruction_following',
  description: 'Evaluates if the model follows system prompt rules and instructions',
  prompt: PROMPT,

  shouldSkip: ({ output }) => !output.answer?.trim(),

  formatContext: ({ output, testCase }) => {
    const inputs = `USER QUESTION: ${testCase.input.question}`

    const outputs = `ASSISTANT RESPONSE:
${output.answer}`

    return { inputs, outputs }
  },
})
