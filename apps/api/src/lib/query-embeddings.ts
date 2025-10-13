import { createHash } from 'crypto'
import { logger } from './logger'

/**
 * Generate a simple deterministic embedding for a search query
 * This is a fallback method that works without external ML models
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    // Create a deterministic hash-based embedding
    const hash = createHash('sha256').update(query.toLowerCase()).digest()

    // Convert hash bytes to float values between -1 and 1
    const embedding = new Array(1536).fill(0)

    for (let i = 0; i < 1536; i++) {
      // Use hash bytes to generate pseudo-random values
      const byteIndex = i % hash.length
      const byteValue = hash.readUInt8(byteIndex)

      // Convert byte (0-255) to float (-1 to 1)
      embedding[i] = (byteValue - 128) / 128
    }

    // Add some query-specific features
    // Length-based features
    embedding[0] = Math.min(query.length / 100, 1) // Normalize length

    // Word count feature
    const wordCount = query.split(/\s+/).length
    embedding[1] = Math.min(wordCount / 20, 1) // Normalize word count

    // Character diversity (unique chars / total chars)
    const uniqueChars = new Set(query.toLowerCase().split('')).size
    embedding[2] = uniqueChars / 50 // Normalize character diversity

    logger.info({ query: query.substring(0, 50), embeddingLength: embedding.length }, 'Generated query embedding')
    return embedding

  } catch (error) {
    logger.error({ error, query }, 'Failed to generate query embedding')
    throw error
  }
}

/**
 * Initialize embedding system on startup
 */
export async function initializeEmbeddingModel(): Promise<void> {
  try {
    logger.info('Embedding system initialized (using deterministic hashing)')
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize embedding system')
  }
}
