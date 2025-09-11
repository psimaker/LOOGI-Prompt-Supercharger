import axios, { AxiosInstance, AxiosError } from 'axios';
import { AIServiceError } from '../middleware/errorHandler';
import { ConfigValidator } from './TextSanitizer';
import { TaskMode, IntentRouter } from './ContractEnforcer';
import { ContractEnforcer } from './ContractEnforcer';
import { TextSanitizer } from './TextSanitizer';

export interface AIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
}

export interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIConfig {
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
  enableRetries: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface GenerationOptions {
  mode: TaskMode;
  originalPrompt: string;
  context?: string;
  language?: string;
  enableContractEnforcement?: boolean;
  promptId?: string;
}

export class EnhancedDeepseekClient {
  private client: AxiosInstance;
  private readonly config: AIConfig;
  private readonly contractEnforcer: ContractEnforcer;

  constructor(config?: Partial<AIConfig>) {
    // Validate configuration
    const validation = ConfigValidator.validateAIConfig();
    if (!validation.valid) {
      throw new Error(`Invalid AI configuration: ${validation.errors.join(', ')}`);
    }

    // Merge with environment config
    const envConfig = ConfigValidator.getAIConfig();
    this.config = {
      ...envConfig,
      ...config,
      enableRetries: config?.enableRetries ?? true,
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
    };

    // Create HTTP client with retry logic
    this.client = this.createHttpClient();
    
    // Initialize contract enforcer
    this.contractEnforcer = new ContractEnforcer(this, {
      maxAttempts: 2,
      enableAutoRetry: true,
      enableContractReminder: true
    });
  }

  private createHttpClient(): AxiosInstance {
    // OPTIMIZED: Dynamic timeout based on prompt complexity
    let timeout = this.config.timeout;
    const isTechnicalMode = this.config.model?.includes('technical') || false;
    const isLongRequest = this.config.maxTokens > 2000;
    
    if (isTechnicalMode || isLongRequest) {
      timeout = Math.max(timeout, 60000); // Minimum 60s for technical/long requests
    }

    const client = axios.create({
      baseURL: this.config.baseURL,
      timeout: timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (this.config.enableRetries) {
      this.setupRetryInterceptor(client);
    }

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const message = (error.response.data as any)?.error?.message || error.message;
          
          if (status === 401) {
            throw new AIServiceError('Invalid API key', { status, message });
          } else if (status === 429) {
            throw new AIServiceError('Rate limit exceeded', { status, message });
          } else if (status >= 500) {
            throw new AIServiceError('AI service unavailable', { status, message });
          } else {
            throw new AIServiceError(`AI service error: ${message}`, { status, message });
          }
        } else if (error.request) {
          throw new AIServiceError('Unable to connect to AI service', { error: error.message });
        } else {
          throw new AIServiceError('AI service configuration error', { error: error.message });
        }
      }
    );

    return client;
  }

  private setupRetryInterceptor(client: AxiosInstance): void {
    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config;
        
        if (!config || !this.shouldRetry(error)) {
          return Promise.reject(error);
        }

        const retryCount = (config as any).retryCount || 0;
        
        if (retryCount >= this.config.maxRetries) {
          return Promise.reject(error);
        }

        (config as any).retryCount = retryCount + 1;
        
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, retryCount);
        await this.sleep(delay);
        
        return client(config);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // Network errors
    
    const status = error.response.status;
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate completion with stable parameters and contract enforcement
   * OPTIMIZED: Dynamic contract configuration based on prompt length and mode
   */
  async generateCompletionWithContract(
    request: AIRequest,
    options: GenerationOptions
  ): Promise<{ content: string; validationResult: any; attempts: number; usage: AIResponse['usage'] }> {
    // Sanitize user text
    if (request.messages.length > 0) {
      const lastMessage = request.messages[request.messages.length - 1];
      if (lastMessage && lastMessage.content) {
        const sanitizedContent = TextSanitizer.sanitizeUserText(lastMessage.content);
        lastMessage.content = sanitizedContent.sanitizedText;
      }
    }

    // OPTIMIZED: Dynamic contract configuration based on prompt length and mode
    const originalPrompt = options.originalPrompt || '';
    const promptLength = originalPrompt.length;
    const isTechnicalMode = options.mode === 'analysis' || options.mode === 'summarize' || options.mode === 'code' || options.mode === 'json';
    const isLongPrompt = promptLength > 3000; // Your prompt has ~3,800 characters

    // For long technical prompts: Reduce contract strictness
    let contractMaxAttempts = 2; // Default
    let enableContractEnforcement = options.enableContractEnforcement !== false;

    if (isLongPrompt && isTechnicalMode) {
      // For long technical documents: Less strict validation
      contractMaxAttempts = 1; // Only 1 attempt instead of 2
      console.log(`[Performance-Optimization] Reduced Contract-Attempts for long technical prompt: length=${promptLength}, mode=${options.mode}, maxAttempts=${contractMaxAttempts}`);
    }

    // Apply stable parameters
    const stableRequest = this.applyStableParameters(request);

    // Generate completion
    const response = await this.generateCompletion(stableRequest);
    let content = response.choices[0]?.message?.content || '';
    
    // Sanitize AI output
    content = TextSanitizer.sanitizeAIOutput(content, options.mode);

    // OPTIMIZED: Contract-enforcement with dynamic maxAttempts
    let validationResult: { isValid: boolean; violations: string[] } = { isValid: true, violations: [] };
    let attempts = 1;

    if (enableContractEnforcement) {
      // Create optimized contract enforcer with reduced attempts for long technical prompts
      const optimizedContractEnforcer = new ContractEnforcer(this, {
        maxAttempts: contractMaxAttempts,
        enableAutoRetry: true,
        enableContractReminder: true
      });

      const enforcementResult = await optimizedContractEnforcer.enforceContract(
        content,
        options.mode,
        options.originalPrompt,
        options.context
      );

      content = enforcementResult.content;
      validationResult = enforcementResult.validationResult;
      attempts = enforcementResult.attempts;
    }

    return {
      content,
      validationResult,
      attempts,
      usage: response.usage
    };
  }

  /**
   * Generate basic completion
   */
  async generateCompletion(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.post<AIResponse>('/chat/completions', {
        ...request,
        model: request.model || this.config.model,
      });

      return response.data;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError('Failed to generate completion', error);
    }
  }

  /**
   * Apply stable parameters to request
   */
  private applyStableParameters(request: AIRequest): AIRequest {
    return {
      ...request,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      frequency_penalty: this.config.frequencyPenalty,
      presence_penalty: this.config.presencePenalty,
      max_tokens: request.max_tokens || this.config.maxTokens,
      seed: this.config.seed,
    };
  }

  /**
   * Enhanced prompt enhancement with task routing and contract enforcement
   */
  async enhancePromptWithTaskRouting(
    originalPrompt: string,
    mode: string,
    maxTokens?: number,
    context?: string,
    language?: string
  ): Promise<{
    enhancedPrompt: string;
    improvements: string[];
    usage: AIResponse['usage'];
    taskMode: TaskMode;
    validationResult: any;
    attempts: number;
  }> {
    // Determine task mode
    const taskMode = IntentRouter.inferTaskMode(originalPrompt, mode);
    
    // Get role template and contract rules
    const roleTemplate = IntentRouter.getRoleTemplate(taskMode);
    const contractRules = IntentRouter.getContractRules(taskMode);
    
    // Create system prompt
    const systemPrompt = this.createEnhancedSystemPrompt(taskMode, roleTemplate, contractRules, context, language);
    
    // Sanitize user text
    const sanitizedInput = TextSanitizer.sanitizeUserText(originalPrompt);
    
    // Create user prompt
    const userPrompt = this.createEnhancedUserPrompt(taskMode, sanitizedInput.sanitizedText, context);

    // Generate with contract enforcement
    const result = await this.generateCompletionWithContract(
      {
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens || this.config.maxTokens,
      },
      {
        mode: taskMode,
        originalPrompt,
        context,
        language: sanitizedInput.originalLanguage,
        enableContractEnforcement: true
      }
    );

    // Parse response
    const { enhancedPrompt, improvements } = this.parseEnhancedResponse(result.content, taskMode);

    return {
      enhancedPrompt,
      improvements,
      usage: result.usage,
      taskMode,
      validationResult: result.validationResult,
      attempts: result.attempts
    };
  }

  /**
   * Create enhanced system prompt with role and contract
   */
  private createEnhancedSystemPrompt(
    taskMode: TaskMode,
    roleTemplate: string,
    contractRules: string[],
    context?: string,
    language?: string
  ): string {
    const languageInstruction = language && language !== 'english' 
      ? `IMPORTANT: Respond in ${language}. `
      : '';

    const factsDiscipline = TextSanitizer.createFactsDisciplineContext(context);
    
    const contractSentence = 'VIOLATION OF THESE RULES WILL RESULT IN IMMEDIATE CONTRACT FAILURE.';
    
    return `${languageInstruction}${roleTemplate}

${factsDiscipline}

CONTRACT RULES (MUST FOLLOW EXACTLY):
${contractRules.map(rule => `• ${rule}`).join('\n')}

${contractSentence}

FINAL OUTPUT REQUIREMENTS:
${this.contractEnforcer.getContractDescription(taskMode)}`;
  }

  /**
   * Create enhanced user prompt
   */
  private createEnhancedUserPrompt(taskMode: TaskMode, sanitizedPrompt: string, context?: string): string {
    const basePrompt = `Process this user request and provide the contracted output:

USER_REQUEST:
${sanitizedPrompt}`;

    if (context) {
      return `${basePrompt}

ADDITIONAL_CONTEXT:
"""${context}"""`;
    }

    return basePrompt;
  }

  /**
   * Parse enhanced response based on task mode
   */
  private parseEnhancedResponse(content: string, taskMode: TaskMode): {
    enhancedPrompt: string;
    improvements: string[];
  } {
    // For enhancement tasks, extract enhanced prompt and improvements
    const enhancedPromptMatch = content.match(/ENHANCED_PROMPT:\s*\n?([\s\S]*?)(?=\nIMPROVEMENTS:|$)/i);
    const improvementsMatch = content.match(/IMPROVEMENTS:\s*\n?([\s\S]*?)$/i);

    const enhancedPrompt = enhancedPromptMatch && enhancedPromptMatch[1] 
      ? enhancedPromptMatch[1].trim() 
      : content;

    const improvements = improvementsMatch && improvementsMatch[1] 
      ? improvementsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.match(/^\d+\.\s*.+/))
          .map(line => line.replace(/^\d+\.\s*/, ''))
          .filter(Boolean)
      : [];

    return { enhancedPrompt, improvements };
  }

  /**
   * Check service availability
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): { model: string; baseURL: string } {
    return {
      model: this.config.model,
      baseURL: this.config.baseURL,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

/**
 * Factory for creating the appropriate client based on configuration
 */
export class AIClientFactory {
  static createClient(): EnhancedDeepseekClient {
    return new EnhancedDeepseekClient();
  }

  static createClientWithConfig(config: Partial<AIConfig>): EnhancedDeepseekClient {
    return new EnhancedDeepseekClient(config);
  }
}

/**
 * Logger for observability
 */
export class AILogger {
  private static instance: AILogger;
  private logs: any[] = [];

  static getInstance(): AILogger {
    if (!AILogger.instance) {
      AILogger.instance = new AILogger();
    }
    return AILogger.instance;
  }

  log(promptId: string, event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      promptId,
      event,
      data,
    };

    this.logs.push(logEntry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AI] ${event}:`, JSON.stringify(data));
    }
  }

  getLogs(promptId?: string): any[] {
    if (promptId) {
      return this.logs.filter(log => log.promptId === promptId);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Deterministic ID generator for prompts
 */
export class DeterministicIdGenerator {
  static generate(prompt: string, mode: TaskMode, config: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({ prompt, mode, config }));
    return `prompt_${hash.digest('hex').substring(0, 16)}`;
  }

  static generateShort(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

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

export { EnhancedDeepseekClient as DeepseekClient }; // Backward compatibility export