export interface SanitizationResult {
  sanitizedText: string;
  originalLanguage: string;
  warnings: string[];
}

export class TextSanitizer {
  /**
   * Sanitize user input text for safe processing
   */
  static sanitizeUserText(text: string): SanitizationResult {
    const warnings: string[] = [];
    
    // Detect language
    const language = this.detectLanguage(text);
    
    // Escape backticks to prevent code injection
    let sanitizedText = text.replace(/`/g, '\\`');
    
    // Remove control characters (except newlines and tabs)
    sanitizedText = sanitizedText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // Remove zero-width characters
    sanitizedText = sanitizedText.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // Handle SQL injection attempts
    if (this.containsSQLInjectionPatterns(sanitizedText)) {
      warnings.push('Potential SQL injection patterns detected');
    }
    
    // Handle command injection attempts
    if (this.containsCommandInjectionPatterns(sanitizedText)) {
      warnings.push('Potential command injection patterns detected');
    }
    
    // Handle prompt injection attempts
    if (this.containsPromptInjectionPatterns(sanitizedText)) {
      warnings.push('Potential prompt injection patterns detected');
      sanitizedText = this.cleanPromptInjection(sanitizedText);
    }
    
    // Wrap in triple quotes for protection
    const wrappedText = `"""${sanitizedText}"""`;
    
    return {
      sanitizedText: wrappedText,
      originalLanguage: language,
      warnings
    };
  }
  
  /**
   * Create protected user text that can't be easily manipulated
   */
  static createProtectedUserText(text: string): string {
    const sanitized = this.sanitizeUserText(text);
    
    // Add additional protection markers
    return `USER_INPUT_START\n${sanitized.sanitizedText}\nUSER_INPUT_END`;
  }
  
  /**
   * Extract user text from protected format
   */
  static extractProtectedUserText(protectedText: string): string {
    const match = protectedText.match(/USER_INPUT_START\n"""([\s\S]*?)"""\nUSER_INPUT_END/);
    return match && match[1] ? match[1] : protectedText;
  }
  
  /**
   * Detect language of the text
   */
  static detectLanguage(text: string): string {
    const words = text.toLowerCase().split(/\s+/);
    
    // German indicators
    const germanWords = ['der', 'die', 'das', 'und', 'für', 'mit', 'von', 'zu', 'den', 'dem', 'ein', 'eine', 'ist', 'sind', 'wird', 'werden', 'ich', 'du', 'er', 'sie', 'es'];
    const germanScore = germanWords.filter(word => words.includes(word)).length;
    
    // French indicators
    const frenchWords = ['le', 'la', 'les', 'et', 'pour', 'avec', 'de', 'à', 'dans', 'sur', 'est', 'sont', 'sera', 'ce', 'cette', 'un', 'une'];
    const frenchScore = frenchWords.filter(word => words.includes(word)).length;
    
    // Spanish indicators
    const spanishWords = ['el', 'la', 'los', 'las', 'y', 'para', 'con', 'de', 'en', 'sobre', 'es', 'son', 'será', 'este', 'esta', 'esto', 'un', 'una'];
    const spanishScore = spanishWords.filter(word => words.includes(word)).length;
    
    // English indicators (higher threshold since it's common)
    const englishWords = ['the', 'and', 'for', 'with', 'from', 'to', 'in', 'on', 'at', 'by', 'is', 'are', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those'];
    const englishScore = englishWords.filter(word => words.includes(word)).length;
    
    // Determine language
    if (germanScore > Math.max(englishScore, frenchScore, spanishScore) && germanScore >= 2) return 'german';
    if (frenchScore > Math.max(englishScore, germanScore, spanishScore) && frenchScore >= 2) return 'french';
    if (spanishScore > Math.max(englishScore, germanScore, frenchScore) && spanishScore >= 2) return 'spanish';
    if (englishScore >= 3) return 'english';
    
    return 'english'; // Default
  }
  
  /**
   * Check for SQL injection patterns
   */
  private static containsSQLInjectionPatterns(text: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|declare|cast|convert)\b.*\b(from|where|and|or|table|database)\b)/i,
      /(--|\/\*|\*\/|xp_)/i,
      /(\b(or|and)\b.*=.*\b(or|and)\b)/i,
      /'.*or.*'.*=/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Check for command injection patterns
   */
  private static containsCommandInjectionPatterns(text: string): boolean {
    const cmdPatterns = [
      /(\b(cat|echo|ls|dir|rm|del|mkdir|rmdir|chmod|chown|sudo|su|wget|curl|nc|netcat)\b)/i,
      /[;&|`]/,
      /\$\(/,
      /\|\|/,
      /&&/
    ];
    
    return cmdPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Check for prompt injection patterns
   */
  private static containsPromptInjectionPatterns(text: string): boolean {
    const injectionPatterns = [
      /ignore.*previous.*instructions/i,
      /forget.*everything.*before/i,
      /disregard.*all.*prior/i,
      /you.*are.*now/i,
      /from.*now.*on/i,
      /system.*prompt/i,
      /role.*play/i,
      /act.*as/i,
      /pretend.*to.*be/i
    ];
    
    return injectionPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Clean prompt injection attempts
   */
  private static cleanPromptInjection(text: string): string {
    // Remove obvious injection attempts
    const cleaned = text
      .replace(/ignore.*previous.*instructions/gi, '[REDACTED]')
      .replace(/forget.*everything.*before/gi, '[REDACTED]')
      .replace(/disregard.*all.*prior/gi, '[REDACTED]')
      .replace(/you.*are.*now.*a/gi, '[REDACTED]')
      .replace(/from.*now.*on/gi, '[REDACTED]');
    
    return cleaned;
  }
  
  /**
   * Create facts discipline context
   */
  static createFactsDisciplineContext(userContext?: string): string {
    const baseContext = 'CRITICAL FACTS DISCIPLINE: Use ONLY facts from the user context provided. Do NOT change numbers, locations, legal choices, or invent any information. Stick strictly to the provided facts.';
    
    if (userContext) {
      return `${baseContext}\n\nUser Context:\n"""${userContext}"""`;
    }
    
    return baseContext;
  }
  
  /**
   * Sanitize AI output to remove meta text
   */
  static sanitizeAIOutput(content: string, mode: string): string {
    content = content.trim();
    
    // Remove common meta prefixes
    const metaPrefixes = [
      /^here is/i,
      /^this is/i,
      /^below is/i,
      /^following is/i,
      /^output:/i,
      /^result:/i,
      /^translation:/i,
      /^summary:/i,
      /^analysis:/i,
      /^plan:/i,
      /^recipe:/i
    ];
    
    for (const prefix of metaPrefixes) {
      content = content.replace(prefix, '');
    }
    
    // Remove common meta suffixes
    const metaSuffixes = [
      /let me know if you need.*$/i,
      /feel free to ask.*$/i,
      /i hope this helps.*$/i,
      /please note.*$/i,
      /important:.*$/i
    ];
    
    for (const suffix of metaSuffixes) {
      content = content.replace(suffix, '');
    }
    
    return content.trim();
  }
  
  /**
   * Estimate token count for text
   */
  static estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Compress text if it exceeds token limit
   */
  static compressText(text: string, maxTokens: number): string {
    const currentTokens = this.estimateTokenCount(text);
    
    if (currentTokens <= maxTokens) {
      return text;
    }
    
    // Simple compression: remove extra whitespace and redundant words
    let compressed = text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .trim();
    
    // If still too long, truncate with ellipsis
    const maxLength = maxTokens * 3.5; // Conservative estimate
    if (compressed.length > maxLength) {
      compressed = compressed.substring(0, maxLength - 3) + '...';
    }
    
    return compressed;
  }
}

/**
 * Configuration validator for environment variables
 */
/**
 * Token budget manager
 */
export class TokenBudgetManager {
  private static readonly ESTIMATION_FACTOR = 3.5; // chars per token
  
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.ESTIMATION_FACTOR);
  }

  static compressIfNeeded(text: string, maxTokens: number, preserveContext: boolean = true): string {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    const maxLength = Math.floor(maxTokens * this.ESTIMATION_FACTOR * 0.9); // 90% to be safe

    if (preserveContext) {
      // Try to preserve important context
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let compressed = '';
      let currentTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokens = this.estimateTokens(sentence);
        if (currentTokens + sentenceTokens <= maxLength) {
          compressed += sentence + '. ';
          currentTokens += sentenceTokens;
        } else {
          break;
        }
      }

      return compressed.trim() || text.substring(0, maxLength);
    }

    return text.substring(0, maxLength);
  }

  static calculateAvailableTokens(prompt: string, maxTotalTokens: number, completionTokens: number): number {
    const promptTokens = this.estimateTokens(prompt);
    const available = maxTotalTokens - promptTokens - completionTokens;
    return Math.max(0, available);
  }
}

export class ConfigValidator {
  static validateAIConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    if (!process.env.AI_API_KEY) {
      errors.push('AI_API_KEY is required');
    }
    
    if (!process.env.AI_API_URL) {
      errors.push('AI_API_URL is required');
    }
    
    if (!process.env.AI_MODEL) {
      errors.push('AI_MODEL is required');
    }
    
    // Optional fields with validation
    if (process.env.AI_MAX_TOKENS) {
      const maxTokens = parseInt(process.env.AI_MAX_TOKENS);
      if (isNaN(maxTokens) || maxTokens < 100 || maxTokens > 32000) {
        errors.push('AI_MAX_TOKENS must be between 100 and 32000');
      }
    }
    
    if (process.env.AI_TEMPERATURE) {
      const temperature = parseFloat(process.env.AI_TEMPERATURE);
      if (isNaN(temperature) || temperature < 0 || temperature > 2) {
        errors.push('AI_TEMPERATURE must be between 0 and 2');
      }
    }
    
    if (process.env.AI_TOP_P) {
      const topP = parseFloat(process.env.AI_TOP_P);
      if (isNaN(topP) || topP < 0 || topP > 1) {
        errors.push('AI_TOP_P must be between 0 and 1');
      }
    }
    
    if (process.env.AI_TIMEOUT) {
      const timeout = parseInt(process.env.AI_TIMEOUT);
      if (isNaN(timeout) || timeout < 1000 || timeout > 120000) {
        errors.push('AI_TIMEOUT must be between 1000 and 120000 milliseconds');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static getAIConfig(): {
    apiKey: string;
    baseURL: string;
    model: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    timeout: number;
    seed?: number;
  } {
    return {
      apiKey: process.env.AI_API_KEY || '',
      baseURL: process.env.AI_API_URL || 'https://api.deepseek.com/v1',
      model: process.env.AI_MODEL || 'deepseek-chat',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
      topP: parseFloat(process.env.AI_TOP_P || '0.9'),
      frequencyPenalty: parseFloat(process.env.AI_FREQUENCY_PENALTY || '0'),
      presencePenalty: parseFloat(process.env.AI_PRESENCE_PENALTY || '0'),
      timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
      seed: process.env.AI_SEED ? parseInt(process.env.AI_SEED) : undefined
    };
  }
}