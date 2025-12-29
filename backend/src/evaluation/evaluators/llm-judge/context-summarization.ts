/**
 * Context Summarization Evaluator (LLM-as-Judge)
 *
 * Evaluates how well the assistant summarizes and uses information from tool results.
 */

import { defineLLMJudgeEvaluator } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

const PROMPT = `You are evaluating how well an AI assistant summarizes and uses information from tool results.

<inputs>
{inputs}
</inputs>

<outputs>
{outputs}
</outputs>

## Evaluation Criteria

1. **Appropriate Length**: Is the summary proportional to the source material?
   - Long tool results should be distilled to key points
   - Short tool results can be relayed more directly

2. **Key Information Preserved**: Are the most important facts included?
   - Main findings should be present
   - Critical details shouldn't be lost

3. **Noise Removed**: Is irrelevant information filtered out?
   - Boilerplate, ads, navigation elements should be excluded
   - Focus on what's relevant to the query

4. **Coherent Synthesis**: Is information from multiple tools combined well?
   - Not just a list of tool outputs
   - Synthesized into a coherent response

## Scoring Guide
- 1.0: Excellent summarization (concise, complete, coherent)
- 0.7-0.9: Good summarization (minor issues)
- 0.4-0.6: Acceptable but could be better
- 0.0-0.3: Poor summarization (too long, missing info, or incoherent)

If no tools were used, evaluate based on response conciseness alone.`

export const contextSummarization = defineLLMJudgeEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'context_summarization',
  description: 'Evaluates how well the assistant summarizes tool results',
  prompt: PROMPT,

  shouldSkip: ({ output }) => !output.content.trim(),

  formatContext: ({ output, testCase }) => {
    const query = testCase.input.question || testCase.input.messages?.[0]?.content || ''

    const inputs = `USER QUERY: ${query}

TOOLS USED: ${output.toolCalls.map((tc) => tc.name).join(', ') || 'None'}`

    const outputs = `ASSISTANT RESPONSE (${output.content.length} characters):
${output.content}`

    return { inputs, outputs }
  },
})
