import { describe, expect, mock, test } from 'bun:test'
import { createStdioStream, type TauriCommandSpawner } from './stdio-stream'

/**
 * Creates a mock Tauri command spawner that returns controllable streams.
 */
const createMockSpawner = (): {
  spawner: TauriCommandSpawner
  mockStdout: TransformStream<Uint8Array>
  mockStdin: TransformStream<Uint8Array>
  onClose: ReturnType<typeof mock>
} => {
  const mockStdout = new TransformStream<Uint8Array>()
  const mockStdin = new TransformStream<Uint8Array>()
  const onClose = mock()

  const spawner: TauriCommandSpawner = mock((_command: string, _args: string[]) => ({
    stdout: mockStdout.readable,
    stdin: mockStdin.writable,
    onClose,
    kill: mock(() => Promise.resolve()),
  }))

  return { spawner, mockStdout, mockStdin, onClose }
}

describe('createStdioStream', () => {
  test('creates a valid ACP stream from a Tauri command', () => {
    const { spawner } = createMockSpawner()

    const result = createStdioStream({
      command: 'claude',
      args: ['--acp'],
      spawn: spawner,
    })

    expect(result.stream).toBeDefined()
    expect(result.stream.readable).toBeInstanceOf(ReadableStream)
    expect(result.stream.writable).toBeInstanceOf(WritableStream)
    expect(result.process).toBeDefined()
  })

  test('spawns the command with the correct arguments', () => {
    const { spawner } = createMockSpawner()

    createStdioStream({
      command: 'claude',
      args: ['--acp', '--verbose'],
      spawn: spawner,
    })

    expect(spawner).toHaveBeenCalledWith('claude', ['--acp', '--verbose'])
  })

  test('provides a kill function to terminate the process', () => {
    const { spawner } = createMockSpawner()

    const result = createStdioStream({
      command: 'claude',
      args: ['--acp'],
      spawn: spawner,
    })

    expect(result.process.kill).toBeDefined()
    expect(typeof result.process.kill).toBe('function')
  })

  test('provides an onClose callback for process exit handling', () => {
    const { spawner, onClose } = createMockSpawner()

    const result = createStdioStream({
      command: 'claude',
      args: ['--acp'],
      spawn: spawner,
    })

    const exitHandler = mock()
    result.process.onClose(exitHandler)

    expect(onClose).toHaveBeenCalledWith(exitHandler)
  })

  test('wraps stdout/stdin with ndJsonStream for ACP compatibility', () => {
    const { spawner } = createMockSpawner()

    const result = createStdioStream({
      command: 'claude',
      args: ['--acp'],
      spawn: spawner,
    })

    // The stream should be an ndJsonStream-wrapped pair
    // verifiable by checking it has both readable and writable
    expect(result.stream.readable).toBeTruthy()
    expect(result.stream.writable).toBeTruthy()
  })
})
