import { ToolInvocationUIPart } from '@ai-sdk/ui-utils'

export type AgentToolResponseProps = {
  part: ToolInvocationUIPart
}

export const AgentToolResponse = ({ part }: AgentToolResponseProps) => {
  const renderResults = (results: any[]) => {
    if (!results || !results.length) return null

    return (
      <div className="space-y-2">
        {results.map((result, index) => (
          <div key={index} className="text-gray-700 leading-relaxed bg-amber-100 p-2">
            {result}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {part.toolInvocation.toolName === 'answer' && part.toolInvocation.args?.text ? (
        <div className="space-y-2">
          <div className="text-gray-700 leading-relaxed">{part.toolInvocation.args.text}</div>
          {renderResults(part.toolInvocation.args.results)}
        </div>
      ) : part.toolInvocation.toolName === 'search' && part.toolInvocation.args?.query ? (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 p-2 rounded-md text-gray-700 leading-relaxed italic flex items-center">Searching for "{part.toolInvocation.args.query}"...</div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-gray-700 leading-relaxed">Unknown tool: {part.toolInvocation.toolName}</div>
        </div>
      )}
    </>
  )
}
