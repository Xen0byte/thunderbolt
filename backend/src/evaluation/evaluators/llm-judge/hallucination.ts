/**
 * Hallucination Evaluator (LLM-as-Judge)
 *
 * Detects if the model made up facts or provided unsupported information.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating whether an AI assistant's response contains hallucinations (made-up facts).

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## What Counts as Hallucination

1. **Fabricated Facts**: Information that appears specific but is not from tool results or verifiable
2. **Invented Details**: Made-up names, dates, numbers, quotes, or statistics
3. **False Confidence**: Presenting uncertain information as definitive fact
4. **Misattribution**: Attributing statements to wrong sources

## What is NOT Hallucination

1. General knowledge that's widely known and verifiable
2. Logical inferences clearly stated as such
3. Hedged statements with appropriate uncertainty ("might", "could", "approximately")

## Scoring Guide
- 1.0: No hallucinations detected
- 0.7-0.9: Minor uncertainties stated as facts
- 0.4-0.6: Some fabricated details
- 0.0-0.3: Significant hallucinations or fabricated facts`

export const hallucination = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'hallucination',
  description: 'Detects if the model made up facts or provided unsupported information',
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
        : 'No tools were used - response is from training data only'

    const inputs = `USER QUESTION: ${testCase.input.question}

AVAILABLE INFORMATION FROM TOOLS:
${toolResults}`

    const outputs = `ASSISTANT RESPONSE:
${output.answer}`

    return { inputs, outputs }
  },
})
