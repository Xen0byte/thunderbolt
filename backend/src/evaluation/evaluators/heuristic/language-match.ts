/**
 * Language Match Evaluator
 *
 * Checks if response is in the same language as the query.
 */

import { defineHeuristicEvaluator, passScore, partialScore } from '../../core'
import type { BehavioralInput, BehavioralOutput, ExpectedBehavior } from '../types'

/**
 * Simple language detection based on character patterns
 */
const detectLanguage = (text: string): string => {
  // Remove code blocks and URLs for cleaner detection
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim()

  if (!cleanText) return 'unknown'

  // Check for CJK characters (Chinese, Japanese, Korean)
  if (/[\u4e00-\u9fff]/.test(cleanText)) return 'chinese'
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(cleanText)) return 'japanese'
  if (/[\uac00-\ud7af]/.test(cleanText)) return 'korean'

  // Check for Cyrillic (Russian, etc.)
  if (/[\u0400-\u04ff]/.test(cleanText)) return 'cyrillic'

  // Check for Arabic
  if (/[\u0600-\u06ff]/.test(cleanText)) return 'arabic'

  // Check for Hebrew
  if (/[\u0590-\u05ff]/.test(cleanText)) return 'hebrew'

  // Check for common Spanish/Portuguese/French accented characters
  const latinExtended = (cleanText.match(/[àáâãäåèéêëìíîïòóôõöùúûüñçßæœ]/gi) || []).length
  const totalChars = cleanText.replace(/\s/g, '').length

  if (totalChars > 0 && latinExtended / totalChars > 0.02) {
    // More than 2% accented chars suggests non-English
    if (/[ñ¿¡]/i.test(cleanText)) return 'spanish'
    if (/[ç]/.test(cleanText) && /[ão]/i.test(cleanText)) return 'portuguese'
    if (/[œæ]/i.test(cleanText)) return 'french'
    return 'romance' // Generic romance language
  }

  // Default to English
  return 'english'
}

export const languageMatch = defineHeuristicEvaluator<BehavioralInput, BehavioralOutput, ExpectedBehavior>({
  name: 'language_match',
  description: 'Checks if response is in the same language as the query',

  evaluate: ({ output, testCase }) => {
    const query = testCase.input.question || testCase.input.messages?.[0]?.content || ''
    const queryLang = detectLanguage(query)
    const responseLang = detectLanguage(output.content)

    // If we can't detect, give benefit of doubt
    if (queryLang === 'unknown' || responseLang === 'unknown') {
      return passScore('Language detection inconclusive')
    }

    // English query can get English response (most common case)
    if (queryLang === 'english' && responseLang === 'english') {
      return passScore('Response language matches query (English)')
    }

    // Non-English query should get same language response
    if (queryLang === responseLang) {
      return passScore(`Response language matches query (${queryLang})`)
    }

    // Mismatch - non-English query got English response
    if (queryLang !== 'english' && responseLang === 'english') {
      return partialScore(`Language mismatch: query in ${queryLang}, response in English`, 0.3)
    }

    // Other mismatches
    return partialScore(`Language mismatch: query in ${queryLang}, response in ${responseLang}`, 0.5)
  },
})
