/**
 * Quality Evaluation Dataset
 *
 * Test cases for WHAT the model answers:
 * - Factual correctness
 * - Helpfulness and completeness
 * - Conciseness and clarity
 */

import type { Dataset } from '../core'
import type { QualityInput, QualityExpected } from '../evaluators/types'

export type QualityTestCase = {
  id: string
  name: string
  description?: string
  category: 'factual' | 'reasoning' | 'creative' | 'technical' | 'research'
  input: QualityInput
  expected: QualityExpected
  tags?: string[]
}

const cases: QualityTestCase[] = [
  // Factual cases
  {
    id: 'qual-fact-001',
    name: 'Company CEO identification',
    description: 'Simple factual question about a company executive',
    category: 'factual',
    input: { question: 'Who is the CEO of Apple?' },
    expected: {
      referenceAnswer:
        'Tim Cook is the CEO of Apple. He has held this position since August 2011, succeeding Steve Jobs.',
      requiredFacts: ['Tim Cook', 'CEO'],
      requiresCurrentInfo: true,
      lengthGuidance: 'brief',
    },
    tags: ['business', 'leadership', 'factual'],
  },
  {
    id: 'qual-fact-002',
    name: 'Historical date',
    description: 'Question about a well-established historical fact',
    category: 'factual',
    input: { question: 'When did World War II end?' },
    expected: {
      referenceAnswer:
        "World War II ended in 1945. In Europe, it ended on May 8, 1945 (V-E Day) with Germany's surrender. In the Pacific, it ended on September 2, 1945 (V-J Day) with Japan's formal surrender.",
      requiredFacts: ['1945', 'September', 'Japan'],
      requiresCurrentInfo: false,
      lengthGuidance: 'brief',
    },
    tags: ['history', 'factual'],
  },
  {
    id: 'qual-fact-003',
    name: 'Technical acronym',
    description: 'Definition of a common technical term',
    category: 'technical',
    input: { question: 'What does API stand for?' },
    expected: {
      referenceAnswer:
        'API stands for Application Programming Interface. It is a set of protocols, routines, and tools that allow different software applications to communicate with each other.',
      requiredFacts: ['Application Programming Interface'],
      requiresCurrentInfo: false,
      lengthGuidance: 'brief',
    },
    tags: ['technical', 'definition'],
  },
  {
    id: 'qual-fact-004',
    name: 'Scientific fact',
    description: 'Basic scientific knowledge question',
    category: 'factual',
    input: { question: 'What is the speed of light?' },
    expected: {
      referenceAnswer:
        'The speed of light in a vacuum is approximately 299,792,458 meters per second (about 300,000 km/s or 186,000 miles per second). This is denoted by the constant "c" in physics.',
      requiredFacts: ['299,792,458', 'meters per second'],
      requiresCurrentInfo: false,
      lengthGuidance: 'brief',
    },
    tags: ['science', 'physics', 'factual'],
  },

  // Reasoning cases
  {
    id: 'qual-reason-001',
    name: 'Simple math problem',
    description: 'Basic arithmetic that requires correct calculation',
    category: 'reasoning',
    input: { question: 'What is 15% of 250?' },
    expected: {
      referenceAnswer: '15% of 250 is 37.5. This is calculated by multiplying 250 by 0.15.',
      requiredFacts: ['37.5'],
      requiresCurrentInfo: false,
      lengthGuidance: 'brief',
    },
    tags: ['math', 'calculation'],
  },
  {
    id: 'qual-reason-002',
    name: 'Logical deduction',
    description: 'Question requiring step-by-step reasoning',
    category: 'reasoning',
    input: {
      question:
        'If all roses are flowers, and some flowers fade quickly, can we conclude that some roses fade quickly?',
    },
    expected: {
      referenceAnswer:
        'No, we cannot conclude that some roses fade quickly. This is a logical fallacy. While all roses are flowers, the flowers that fade quickly might not include any roses.',
      requiredFacts: ['No', 'cannot conclude', 'fallacy'],
      requiresCurrentInfo: false,
      lengthGuidance: 'moderate',
    },
    tags: ['logic', 'reasoning'],
  },
  {
    id: 'qual-reason-003',
    name: 'Comparison analysis',
    description: 'Analyzing pros and cons of two options',
    category: 'reasoning',
    input: {
      question: 'What are the main differences between Python and JavaScript for backend development?',
    },
    expected: {
      referenceAnswer:
        'Key differences: (1) Runtime: Python runs on CPython/PyPy, JavaScript on Node.js/Deno. (2) Syntax: Python uses indentation, JavaScript uses braces. (3) Concurrency: Python has GIL limitations, Node.js excels at async I/O.',
      requiredFacts: ['Node.js', 'async', 'Django', 'Express'],
      requiresCurrentInfo: false,
      lengthGuidance: 'moderate',
    },
    tags: ['programming', 'comparison', 'technical'],
  },

  // Technical cases
  {
    id: 'qual-tech-001',
    name: 'Code implementation',
    description: 'Request for a specific code solution',
    category: 'technical',
    input: { question: 'Write a Python function that reverses a string' },
    expected: {
      referenceAnswer: 'def reverse_string(s: str) -> str:\n    return s[::-1]',
      requiredFacts: ['def', 'return', '[::-1]'],
      requiresCurrentInfo: false,
      lengthGuidance: 'moderate',
    },
    tags: ['code', 'python', 'technical'],
  },
  {
    id: 'qual-tech-002',
    name: 'Technical concept explanation',
    description: 'Explaining a programming concept clearly',
    category: 'technical',
    input: { question: 'Explain what a closure is in JavaScript' },
    expected: {
      referenceAnswer:
        'A closure in JavaScript is a function that has access to variables from its outer (enclosing) scope, even after the outer function has returned.',
      requiredFacts: ['outer', 'scope', 'access', 'variables'],
      requiresCurrentInfo: false,
      lengthGuidance: 'moderate',
    },
    tags: ['javascript', 'concept', 'technical'],
  },

  // Research cases
  {
    id: 'qual-research-001',
    name: 'Current software version',
    description: 'Question requiring up-to-date information lookup',
    category: 'research',
    input: { question: "What's the latest LTS version of Node.js?" },
    expected: {
      referenceAnswer:
        'The latest LTS (Long Term Support) version of Node.js should be looked up from the official Node.js website (nodejs.org).',
      requiredFacts: ['LTS', 'nodejs.org'],
      requiresCurrentInfo: true,
      lengthGuidance: 'brief',
    },
    tags: ['software', 'current-info', 'research'],
  },
  {
    id: 'qual-research-002',
    name: 'IPO filing information',
    description: 'Research question about regulatory filings',
    category: 'research',
    input: {
      question:
        'A company is planning to go public. Where can I find the documents they need to publish for their IPO?',
    },
    expected: {
      referenceAnswer:
        'IPO documents are filed with the SEC (Securities and Exchange Commission) and available on the EDGAR database at sec.gov/edgar. The key document is the S-1 Registration Statement.',
      requiredFacts: ['SEC', 'EDGAR', 'S-1', 'Registration Statement'],
      requiresCurrentInfo: false,
      lengthGuidance: 'moderate',
    },
    tags: ['finance', 'ipo', 'regulatory', 'research'],
  },
]

/**
 * Quality evaluation dataset
 */
export const qualityDataset: Dataset<QualityInput, QualityExpected> = {
  name: 'thunderbolt-quality',
  description: 'Tests WHAT the model answers: correctness, helpfulness, clarity',
  source: 'dataset',
  cases: cases.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    source: 'dataset' as const,
    input: c.input,
    expected: c.expected,
    tags: c.tags,
    metadata: { category: c.category },
  })),
}

/**
 * Get cases by category
 */
export const getQualityCasesByCategory = (category: QualityTestCase['category']) =>
  cases.filter((c) => c.category === category)

/**
 * Get cases by tag
 */
export const getQualityCasesByTag = (tag: string) => cases.filter((c) => c.tags?.includes(tag))
