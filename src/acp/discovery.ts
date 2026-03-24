import { isAgentAvailableOnPlatform } from '@/lib/platform'
import { isAgentAvailable } from '@/acp/stdio-stream'
import { localAgentCandidates, hashAgent, haystackAgentFromPipeline } from '@/defaults/agents'
import { agentsTable } from '@/db/tables'
import { eq, inArray } from 'drizzle-orm'
import type { AnyDrizzleDatabase } from '@/db/database-interface'
import type { Agent } from '@/types'

/**
 * Upsert agents into the DB, inserting new ones and updating changed ones.
 * Compares by hash to avoid unnecessary writes.
 */
const upsertAgents = async (db: AnyDrizzleDatabase, agents: Agent[]): Promise<void> => {
  if (agents.length === 0) return

  const existingRows = await db
    .select()
    .from(agentsTable)
    .where(
      inArray(
        agentsTable.id,
        agents.map((a) => a.id),
      ),
    )
  const existingById = new Map(existingRows.map((r) => [r.id, r]))

  await Promise.all(
    agents.map((agent) => {
      const agentHash = hashAgent(agent)
      const existing = existingById.get(agent.id)

      if (!existing) {
        return db.insert(agentsTable).values({ ...agent, defaultHash: agentHash })
      }
      if (existing.defaultHash !== agentHash) {
        return db
          .update(agentsTable)
          .set({ ...agent, defaultHash: agentHash })
          .where(eq(agentsTable.id, agent.id))
      }
    }),
  )
}

/**
 * Discover local CLI agents available on this machine and upsert them into the DB.
 * Only runs on Tauri desktop — returns immediately on web/mobile.
 */
export const discoverAndSeedLocalAgents = async (db: AnyDrizzleDatabase): Promise<Agent[]> => {
  if (!isAgentAvailableOnPlatform('local')) {
    return []
  }

  const { createTauriSpawner } = await import('@/acp/tauri-spawner')
  const spawner = createTauriSpawner()

  const candidatesWithCommand = localAgentCandidates.filter((c) => c.command)
  const existenceResults = await Promise.all(candidatesWithCommand.map((c) => isAgentAvailable(spawner, c.command!)))

  const discovered = candidatesWithCommand.filter((_, i) => existenceResults[i])
  await upsertAgents(db, discovered)
  return discovered
}

type HaystackPipelineInfo = {
  slug: string
  name: string
  icon?: string
}

/**
 * Discover remote Haystack agents from the backend and upsert them into the DB.
 * Gracefully returns empty if the backend doesn't have Haystack configured.
 */
export const discoverAndSeedRemoteHaystackAgents = async (
  db: AnyDrizzleDatabase,
  cloudUrl: string,
): Promise<Agent[]> => {
  let pipelines: HaystackPipelineInfo[]
  try {
    const response = await fetch(`${cloudUrl}/haystack/pipelines`)
    if (!response.ok) {
      return []
    }
    const data = (await response.json()) as { data: HaystackPipelineInfo[] }
    pipelines = data.data
  } catch {
    return []
  }

  if (!pipelines || pipelines.length === 0) {
    return []
  }

  const wsBaseUrl = cloudUrl.replace(/^http/, 'ws')
  const agents = pipelines.map((p) => haystackAgentFromPipeline(p, wsBaseUrl))
  await upsertAgents(db, agents)
  return agents
}
