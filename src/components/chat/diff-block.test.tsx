import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'bun:test'
import { DiffBlock } from './diff-block'

describe('DiffBlock', () => {
  test('renders the file path', () => {
    render(<DiffBlock path="src/main.ts" oldText="const a = 1" newText="const a = 2" />)

    expect(screen.getByText('src/main.ts')).toBeInTheDocument()
  })

  test('renders added lines with + prefix', () => {
    render(<DiffBlock path="src/main.ts" oldText="const a = 1" newText="const a = 2" />)

    expect(screen.getByText(/\+ const a = 2/)).toBeInTheDocument()
  })

  test('renders removed lines with - prefix', () => {
    render(<DiffBlock path="src/main.ts" oldText="const a = 1" newText="const a = 2" />)

    expect(screen.getByText(/- const a = 1/)).toBeInTheDocument()
  })

  test('renders new file when oldText is not provided', () => {
    render(<DiffBlock path="src/new-file.ts" newText="export const hello = 'world'" />)

    expect(screen.getByText('src/new-file.ts')).toBeInTheDocument()
    expect(screen.getByText(/\+ export const hello/)).toBeInTheDocument()
  })

  test('renders unchanged lines without prefix', () => {
    const oldText = 'line1\nline2\nline3'
    const newText = 'line1\nmodified\nline3'

    render(<DiffBlock path="test.ts" oldText={oldText} newText={newText} />)

    // Unchanged lines should be present
    expect(screen.getByText(/line1/)).toBeInTheDocument()
    expect(screen.getByText(/line3/)).toBeInTheDocument()
  })

  test('handles empty strings', () => {
    render(<DiffBlock path="empty.ts" oldText="" newText="new content" />)

    expect(screen.getByText('empty.ts')).toBeInTheDocument()
    expect(screen.getByText(/\+ new content/)).toBeInTheDocument()
  })

  test('renders multi-line diffs correctly', () => {
    const oldText = 'import { a } from "./a"\n\nconst x = 1\nconst y = 2'
    const newText = 'import { a } from "./a"\nimport { b } from "./b"\n\nconst x = 1\nconst y = 3'

    render(<DiffBlock path="multi.ts" oldText={oldText} newText={newText} />)

    expect(screen.getByText('multi.ts')).toBeInTheDocument()
  })
})
