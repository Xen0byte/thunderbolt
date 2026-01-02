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
    source: string
    prompt: string
  }
  is_part_of_score: boolean
}

/** Quality evaluator definitions (source column is set dynamically) */
const QUALITY_EVALUATOR_DEFINITIONS = [
  {
    name: 'Answer Quality',
    prompt:
      'Is this response accurate, helpful, well-structured, and complete? Respond TRUE if high quality, FALSE otherwise.',
  },
  {
    name: 'Faithfulness',
    prompt:
      'Does this response stick to facts without fabricating information? Respond TRUE if faithful, FALSE otherwise.',
  },
  {
    name: 'No Hallucination',
    prompt:
      'Is this response free of made-up facts, names, dates, or statistics? Respond TRUE if no hallucinations, FALSE otherwise.',
  },
  {
    name: 'Appropriate Confidence',
    prompt:
      'Does this response express appropriate uncertainty and avoid overconfident claims? Respond TRUE if appropriate, FALSE otherwise.',
  },
]

/** Build quality evaluators for a specific source column */
export const buildQualityEvaluators = (sourceColumn: string): LLMAssertionColumn[] =>
  QUALITY_EVALUATOR_DEFINITIONS.map((def) => ({
    column_type: 'LLM_ASSERTION' as const,
    name: def.name,
    configuration: {
      source: sourceColumn,
      prompt: def.prompt,
    },
    is_part_of_score: true,
  }))

/** Options for creating a quality evaluation */
export type CreateQualityEvaluationOptions = {
  /** Name for the evaluation pipeline */
  name?: string
  /** Column name containing the AI response to evaluate (default: 'response') */
  sourceColumn?: string
}

/** Create an evaluation pipeline with quality evaluators */
export const createQualityEvaluation = async (
  datasetGroupId: number,
  options?: CreateQualityEvaluationOptions,
): Promise<{ reportId: number; columns: unknown[] }> => {
  const { name, sourceColumn = 'response' } = options ?? {}
  const evaluators = buildQualityEvaluators(sourceColumn)

  const response = await fetch(`${PROMPTLAYER_API_URL}/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      dataset_group_id: datasetGroupId,
      name: name ?? `Quality Evaluation - ${new Date().toISOString()}`,
      columns: evaluators,
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

/** Options for running a quality evaluation */
export type RunQualityEvaluationOptions = {
  /** Name for the evaluation */
  name?: string
  /** Specific dataset version ID (uses latest if not provided) */
  datasetId?: number
  /** Column name containing the AI response to evaluate (default: 'response') */
  sourceColumn?: string
  /** Progress callback */
  onProgress?: (message: string) => void
}

/** Run a complete quality evaluation on a dataset */
export const runQualityEvaluation = async (
  datasetGroupId: number,
  options?: RunQualityEvaluationOptions,
): Promise<{ reportId: number; overallScore: number; details: Record<string, unknown> }> => {
  const { name, datasetId, sourceColumn, onProgress } = options ?? {}

  // Step 1: Create the evaluation pipeline
  onProgress?.('Creating evaluation pipeline...')
  const { reportId } = await createQualityEvaluation(datasetGroupId, { name, sourceColumn })
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
