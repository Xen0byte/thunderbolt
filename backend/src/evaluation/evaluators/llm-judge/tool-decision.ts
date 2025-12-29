/**
 * Tool Decision Evaluator (LLM-as-Judge)
 *
 * Evaluates if the model made appropriate decisions about when to use tools.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating whether an AI assistant made appropriate decisions about when to use tools.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Tool Necessity**: 
   - Did it use tools when they would help answer the question?
   - Did it avoid unnecessary tool calls for simple questions?

2. **Tool Selection**:
   - Did it choose the right tools for the task?
   - web_search for current information
   - fetch_content for detailed page content

3. **Query Quality** (if tools were used):
   - Were search queries well-formulated?
   - Were they specific enough to get useful results?

4. **Efficiency**:
   - Did it avoid redundant tool calls?
   - Did it gather enough information without over-fetching?

## Scoring Guide
- 1.0: Perfect tool usage decisions
- 0.7-0.9: Good decisions with minor inefficiencies
- 0.4-0.6: Some questionable decisions
- 0.0-0.3: Poor tool usage decisions`

export const toolDecision = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'tool_decision',
  description: 'Evaluates if the model made appropriate decisions about tool usage',
  prompt: PROMPT,

  formatContext: ({ output, testCase }) => {
    const expected = testCase.expected || {}
    const requiresCurrentInfo = expected.requiresCurrentInfo ?? false

    const toolCalls =
      output.toolCalls.length > 0
        ? output.toolCalls
            .map((t) => {
              const args = JSON.stringify(t.arguments)
              return `- ${t.tool}: ${args}`
            })
            .join('\n')
        : 'No tools were used'

    const inputs = `USER QUESTION: ${testCase.input.question}

CONTEXT:
- Requires current information: ${requiresCurrentInfo ? 'Yes' : 'No'}
- Reference answer suggests: ${expected.referenceAnswer ? 'Answer available' : 'No reference'}`

    const outputs = `TOOL CALLS MADE:
${toolCalls}

FINAL ANSWER:
${output.answer || '(No answer provided)'}`

    return { inputs, outputs }
  },
})
