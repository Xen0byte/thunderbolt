import { getSettings } from '@/config/settings'

const PROMPTLAYER_API_URL = 'https://api.promptlayer.com'

/** Get headers for PromptLayer API requests */
const getHeaders = () => {
  const settings = getSettings()
  return {
    'X-API-KEY': settings.promptlayerApiKey,
    'Content-Type': 'application/json',
  }
}

/** LLM Assertion column configuration */
type LLMAssertionColumn = {
  column_type: 'LLM_ASSERTION'
  name: string
  configuration: {
    source: string // Column name containing the text to evaluate
    prompt: string // Evaluation prompt (e.g., "Is this response helpful?")
    variable_mappings?: Record<string, string> // Map prompt variables to dataset columns
  }
  is_part_of_score: boolean
}

/** Quality evaluation criteria using LLM-as-judge */
export const QUALITY_EVALUATORS: LLMAssertionColumn[] = [
  {
    column_type: 'LLM_ASSERTION',
    name: 'Answer Quality',
    configuration: {
      source: 'response', // Assumes dataset has a 'response' column
      prompt: `Evaluate if this AI response is high quality. Consider:
- Is it accurate and factually correct?
- Is it helpful and addresses the user's question?
- Is it well-structured and easy to understand?
- Is it complete without unnecessary information?

Respond with TRUE if high quality, FALSE otherwise.`,
    },
    is_part_of_score: true,
  },
  {
    column_type: 'LLM_ASSERTION',
    name: 'Faithfulness',
    configuration: {
      source: 'response',
      prompt: `Does this response stay faithful to the facts without making up information?
Consider if the AI:
- Sticks to what it knows
- Doesn't hallucinate or fabricate details
- Admits uncertainty when appropriate

Respond with TRUE if faithful, FALSE otherwise.`,
    },
    is_part_of_score: true,
  },
  {
    column_type: 'LLM_ASSERTION',
    name: 'No Hallucination',
    configuration: {
      source: 'response',
      prompt: `Check if this response contains any hallucinations or made-up information.
- Are there any false claims?
- Are there invented facts, names, dates, or statistics?
- Is there any content that seems fabricated?

Respond with TRUE if no hallucinations detected, FALSE if hallucinations found.`,
    },
    is_part_of_score: true,
  },
  {
    column_type: 'LLM_ASSERTION',
    name: 'Appropriate Confidence',
    configuration: {
      source: 'response',
      prompt: `Does this response show appropriate confidence levels?
- Does it express uncertainty when it should?
- Does it avoid overconfident claims about uncertain topics?
- Does it properly hedge speculative statements?

Respond with TRUE if confidence is appropriate, FALSE otherwise.`,
    },
    is_part_of_score: true,
  },
]

/** Create an evaluation pipeline with quality evaluators */
export const createQualityEvaluation = async (
  datasetGroupId: number,
  name?: string,
): Promise<{ reportId: number; columns: unknown[] }> => {
  const response = await fetch(`${PROMPTLAYER_API_URL}/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      dataset_group_id: datasetGroupId,
      name: name ?? `Quality Evaluation - ${new Date().toISOString()}`,
      columns: QUALITY_EVALUATORS,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create evaluation pipeline: ${response.status} - ${error}`)
  }

  const result = await response.json()
  return {
    reportId: result.report_id,
    columns: result.report_columns,
  }
}

/** Run an evaluation */
export const runEvaluation = async (reportId: number, name?: string, datasetId?: number): Promise<number> => {
  const body: Record<string, unknown> = {
    name: name ?? `Eval Run - ${new Date().toISOString()}`,
  }
  if (datasetId) {
    body.dataset_id = datasetId
  }

  const response = await fetch(`${PROMPTLAYER_API_URL}/reports/${reportId}/run`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to run evaluation: ${response.status} - ${error}`)
  }

  const result = await response.json()
  return result.report_id // This is the run report ID
}

/** Get evaluation status */
export const getEvaluationStatus = async (reportId: number): Promise<{ status: string; progress?: number }> => {
  const response = await fetch(`${PROMPTLAYER_API_URL}/reports/${reportId}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get evaluation status: ${response.status} - ${error}`)
  }

  const result = await response.json()
  return {
    status: result.status,
    progress: result.progress,
  }
}

/** Get evaluation score */
export const getEvaluationScore = async (
  reportId: number,
): Promise<{ overallScore: number; details: Record<string, unknown> }> => {
  const response = await fetch(`${PROMPTLAYER_API_URL}/reports/${reportId}/score`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get evaluation score: ${response.status} - ${error}`)
  }

  const result = await response.json()
  return {
    overallScore: result.score?.overall_score ?? 0,
    details: result.score ?? {},
  }
}

/** Poll for evaluation completion */
export const waitForEvaluation = async (
  reportId: number,
  options?: { pollIntervalMs?: number; timeoutMs?: number; onProgress?: (status: string) => void },
): Promise<{ overallScore: number; details: Record<string, unknown> }> => {
  const { pollIntervalMs = 5000, timeoutMs = 300000, onProgress } = options ?? {}
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const { status } = await getEvaluationStatus(reportId)

    if (onProgress) {
      onProgress(status)
    }

    if (status === 'COMPLETED') {
      return getEvaluationScore(reportId)
    }

    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(`Evaluation failed with status: ${status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`Evaluation timed out after ${timeoutMs}ms`)
}

/** Run a complete quality evaluation on a dataset */
export const runQualityEvaluation = async (
  datasetGroupId: number,
  options?: {
    name?: string
    datasetId?: number
    onProgress?: (message: string) => void
  },
): Promise<{ reportId: number; overallScore: number; details: Record<string, unknown> }> => {
  const { name, datasetId, onProgress } = options ?? {}

  // Step 1: Create the evaluation pipeline
  onProgress?.('Creating evaluation pipeline...')
  const { reportId } = await createQualityEvaluation(datasetGroupId, name)
  onProgress?.(`Pipeline created: ${reportId}`)

  // Step 2: Run the evaluation
  onProgress?.('Starting evaluation run...')
  const runReportId = await runEvaluation(reportId, name, datasetId)
  onProgress?.(`Evaluation started: ${runReportId}`)

  // Step 3: Wait for completion
  const result = await waitForEvaluation(runReportId, {
    onProgress: (status) => onProgress?.(`Status: ${status}`),
  })

  onProgress?.(`Evaluation complete! Score: ${result.overallScore}%`)

  return {
    reportId: runReportId,
    ...result,
  }
}

/** List available datasets */
export const listDatasets = async (): Promise<
  Array<{ id: number; name: string; dataset_group_id: number; version_number: number }>
> => {
  const response = await fetch(`${PROMPTLAYER_API_URL}/api/public/v2/datasets?status=active&page=1&per_page=100`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list datasets: ${response.status} - ${error}`)
  }

  const result = await response.json()

  // Map the response to include dataset group name
  return (result.datasets ?? []).map(
    (d: { id: number; dataset_group_id: number; version_number: number; dataset_group?: { name: string } }) => ({
      id: d.id,
      name: d.dataset_group?.name ?? `Dataset ${d.id}`,
      dataset_group_id: d.dataset_group_id,
      version_number: d.version_number,
    }),
  )
}
