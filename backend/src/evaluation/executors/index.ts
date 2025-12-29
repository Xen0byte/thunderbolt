/**
 * Executors
 *
 * Test execution strategies for different evaluation types.
 */

// Live executors (call the model)
export { singleTurnExecutor } from './single-turn'
export { multiTurnExecutor } from './multi-turn'
export { runTool, type ToolResult } from './tool-runner'

// Offline executor (for trace evaluation)
export { offlineExecutor, traceToOfflineInput, type OfflineInput, type OfflineOutput } from './offline'
