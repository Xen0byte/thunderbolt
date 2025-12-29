/**
 * Confidence Evaluator (LLM-as-Judge)
 *
 * Evaluates if the model expresses appropriate uncertainty.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating whether an AI assistant expresses appropriate confidence levels in its response.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Appropriate Uncertainty**: Does the response hedge appropriately when information is:
   - From potentially outdated training data
   - Based on search results that may be incomplete
   - About topics with inherent uncertainty

2. **No Overconfidence**: Does the response avoid:
   - Stating opinions as facts
   - Presenting estimates as exact figures
   - Claiming certainty about future events

3. **Clear Confidence Signals**: Does the response use appropriate language like:
   - "Based on my search results..."
   - "As of the information available..."
   - "Approximately..." or "Around..."

4. **Balanced**: Not overly hedged to the point of being unhelpful

## Scoring Guide
- 1.0: Perfectly calibrated confidence
- 0.7-0.9: Good confidence calibration with minor issues
- 0.4-0.6: Some over/underconfidence issues
- 0.0-0.3: Significantly miscalibrated confidence`

export const confidence = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'confidence',
  description: 'Evaluates if the model expresses appropriate uncertainty',
  prompt: PROMPT,

  shouldSkip: ({ output }) => !output.answer?.trim(),

  formatContext: ({ output, testCase }) => {
    const expected = testCase.expected || {}
    const requiresCurrentInfo = expected.requiresCurrentInfo ?? false

    const inputs = `USER QUESTION: ${testCase.input.question}

CONTEXT:
- Requires current information: ${requiresCurrentInfo ? 'Yes' : 'No'}
- Tools used: ${output.toolCalls.length > 0 ? output.toolCalls.map((t) => t.tool).join(', ') : 'None'}`

    const outputs = `ASSISTANT RESPONSE:
${output.answer}`

    return { inputs, outputs }
  },
})
