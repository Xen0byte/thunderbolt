import { Terminal } from 'lucide-react'

type TerminalBlockProps = {
  terminalId: string
}

/**
 * Renders a terminal output block for ACP terminal content.
 * Displays the terminal ID as a reference — actual output is managed
 * by the ACP terminal lifecycle (createTerminal, terminalOutput, etc.).
 */
export const TerminalBlock = ({ terminalId }: TerminalBlockProps) => (
  <div className="rounded-lg border overflow-hidden text-xs font-mono">
    <div className="bg-muted px-3 py-1.5 text-muted-foreground font-medium border-b flex items-center gap-1.5">
      <Terminal className="h-3 w-3" />
      Terminal
    </div>
    <div className="bg-zinc-950 text-zinc-300 px-3 py-2 min-h-[2rem]" data-terminal-id={terminalId}>
      <span className="text-zinc-500">Terminal {terminalId}</span>
    </div>
  </div>
)
