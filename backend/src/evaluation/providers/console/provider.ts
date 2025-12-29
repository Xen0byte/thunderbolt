/**
 * Console Provider
 *
 * Outputs evaluation results to the terminal only.
 * No external service required - always available.
 */

import type { Provider, Reporter } from '../../core'
import type { ProviderOptions } from '../registry'
import { createConsoleReporter } from './reporter'

export class ConsoleProvider implements Provider {
  readonly name = 'console'
  private options: ProviderOptions

  constructor(options: ProviderOptions = {}) {
    this.options = options
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }

  createReporter(): Reporter {
    return createConsoleReporter(this.options)
  }
}
