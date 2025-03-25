import { emailMessagesTable, emailThreadsTable } from '@/db/schema'
import { DrizzleContextType, EmailMessage } from '@/types'
import { eq, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

/**
 * Extract references from email parts
 * @param email The email message to extract references from
 * @returns An array of reference message IDs
 */
function extractReferences(email: EmailMessage): string[] {
  const [part] = email.parts.parts
  const headers = part.headers
  const references = headers?.find((header) => header.name === 'references' && header.value && header.value.TextList)?.value?.TextList ?? []
  return references
}

/**
 * EmailThreader class for managing email threads
 * Groups emails into threads based on in-reply-to headers
 */
export class EmailThreader {
  private db: DrizzleContextType['db']
  private batchSize: number
  private shouldCancelAfterNextBatch: boolean
  private threadsCreated: number
  private messagesProcessed: number

  /**
   * Creates a new EmailThreader instance
   * @param db Database connection
   * @param batchSize Number of emails to process in each batch (default: 10)
   */
  constructor(db: DrizzleContextType['db'], batchSize: number = 10) {
    this.db = db
    this.batchSize = batchSize
    this.shouldCancelAfterNextBatch = false
    this.threadsCreated = 0
    this.messagesProcessed = 0
  }

  /**
   * Cancels the email processing after the current batch completes
   */
  cancel(): void {
    this.shouldCancelAfterNextBatch = true
  }

  /**
   * Get the current processing status
   * @returns An object containing the current processing status
   */
  getStatus(): { threadsCreated: number; messagesProcessed: number; isProcessing: boolean } {
    return {
      threadsCreated: this.threadsCreated,
      messagesProcessed: this.messagesProcessed,
      isProcessing: !this.shouldCancelAfterNextBatch,
    }
  }

  /**
   * Process emails and organize them into threads
   * @returns A promise that resolves when all emails are processed
   */
  async processEmails(): Promise<void> {
    try {
      while (true) {
        // Get a batch of emails that haven't been assigned to a thread yet
        const unprocessedEmails = await this.db
          .select()
          .from(emailMessagesTable)
          .where(sql`${emailMessagesTable.email_thread_id} IS NULL`)
          .limit(this.batchSize)

        // If no more emails to process, break the loop
        if (unprocessedEmails.length === 0) {
          break
        }

        // Process each email in the batch
        for (const email of unprocessedEmails) {
          await this.processEmail(email)
          this.messagesProcessed++
        }

        // Check if we should stop after this batch
        if (this.shouldCancelAfterNextBatch) {
          break
        }
      }
    } catch (error) {
      console.error('Failed to process emails:', error)
      throw error
    }
  }

  /**
   * Process a single email and assign it to a thread
   * @param email The email message to process
   * @returns A promise that resolves when the email is processed
   */
  private async processEmail(email: EmailMessage): Promise<void> {
    try {
      // Extract references from the email parts
      const [rootEmailMessageId] = extractReferences(email)

      // If we don't have a root email message id, create a new thread
      if (!rootEmailMessageId) {
        const threadId = uuidv7()
        await this.createThread(threadId, email.subject, email.date, email.messageId)
        await this.addEmailToThread(email.id, threadId, email.subject, email.date)
        return
      }

      // Look for a thread with this root_message_id
      const existingThread = await this.db.select().from(emailThreadsTable).where(eq(emailThreadsTable.root_message_id, rootEmailMessageId)).limit(1).get()

      if (!existingThread) {
        const threadId = uuidv7()
        await this.createThread(threadId, email.subject, email.date, rootEmailMessageId)
        await this.addEmailToThread(email.id, threadId, email.subject, email.date)
        return
      }

      await this.addEmailToThread(email.id, existingThread.id, email.subject, email.date)
    } catch (error) {
      console.error(`Failed to process email ${email.id}:`, error)
      throw error
    }
  }

  /**
   * Create a new email thread
   * @param id Thread ID
   * @param subject Thread subject
   * @param date Thread date
   * @param rootEmailMessageId Root email message id
   * @returns A promise that resolves when the thread is created
   */
  private async createThread(id: string, subject: string | null, date: string, rootEmailMessageId: string): Promise<void> {
    try {
      await this.db.insert(emailThreadsTable).values({
        id,
        subject: subject || '(No Subject)',
        date,
        root_message_id: rootEmailMessageId,
      })
      this.threadsCreated++
    } catch (error) {
      console.error('Failed to create thread:', error)
      throw error
    }
  }

  /**
   * Add an email to a thread
   * @param emailId Email ID
   * @param threadId Thread ID
   * @param subject Email subject
   * @param date Email date
   * @returns A promise that resolves when the email is added to the thread
   */
  private async addEmailToThread(emailId: string, threadId: string, subject: string | null, date: string): Promise<void> {
    try {
      // Update the email to be part of the thread
      await this.db.update(emailMessagesTable).set({ email_thread_id: threadId }).where(eq(emailMessagesTable.id, emailId))

      // Update thread subject if this email is older than the current thread date
      const thread = await this.db.select().from(emailThreadsTable).where(eq(emailThreadsTable.id, threadId)).limit(1)

      if (thread.length > 0) {
        const threadDate = new Date(thread[0].date)
        const emailDate = new Date(date)

        // If this email is older, update the thread subject and date
        if (emailDate < threadDate) {
          await this.db
            .update(emailThreadsTable)
            .set({
              subject: subject || thread[0].subject || '(No Subject)',
              date,
            })
            .where(eq(emailThreadsTable.id, threadId))
        }
      }
    } catch (error) {
      console.error(`Failed to add email ${emailId} to thread ${threadId}:`, error)
      throw error
    }
  }
}
