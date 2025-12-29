/**
 * Tool Execution Evaluator (LLM-as-Judge)
 *
 * Evaluates the quality of tool usage (queries, URLs, error handling).
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { QualityInput, QualityOutput, QualityExpected } from '../types'

const PROMPT = `You are evaluating how well an AI assistant executed tool calls.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Query Quality** (for web_search):
   - Are search queries specific and well-formulated?
   - Do they target the information needed?

2. **URL Selection** (for fetch_content):
   - Are relevant URLs selected from search results?
   - Are authoritative sources preferred?

3. **Error Handling**:
   - How did the assistant handle failed tool calls?
   - Did it try alternatives when needed?

4. **Result Utilization**:
   - Did the assistant effectively use the returned information?
   - Did it synthesize information from multiple sources?

## Scoring Guide
- 1.0: Excellent tool execution
- 0.7-0.9: Good execution with minor issues
- 0.4-0.6: Adequate but room for improvement
- 0.0-0.3: Poor tool execution

If no tools were used, score based on whether tools SHOULD have been used.`

export const toolExecution = defineLLMJudgeEvaluator<QualityInput, QualityOutput, QualityExpected>({
  name: 'tool_execution',
  description: 'Evaluates the quality of tool usage execution',
  prompt: PROMPT,

  shouldSkip: ({ output }) => output.toolCalls.length === 0,

  formatContext: ({ output, testCase }) => {
    const toolDetails = output.toolCalls
      .map((t, i) => {
        const args = JSON.stringify(t.arguments)
        const resultPreview = t.result.length > 300 ? t.result.slice(0, 300) + '...' : t.result
        const error = t.error ? `ERROR: ${t.error}` : ''
        return `Call ${i + 1}: ${t.tool}
  Arguments: ${args}
  Result: ${resultPreview}
  ${error}`
      })
      .join('\n\n')

    const inputs = `USER QUESTION: ${testCase.input.question}

NUMBER OF TOOL CALLS: ${output.toolCalls.length}
TOTAL TURNS: ${output.turnCount}`

    const outputs = `TOOL EXECUTION DETAILS:
${toolDetails}

FINAL ANSWER:
${output.answer || '(No answer provided)'}`

    return { inputs, outputs }
  },
})
