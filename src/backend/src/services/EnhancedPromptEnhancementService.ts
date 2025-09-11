import { UserInput, UserInputModel } from '../models/UserInput';
import { EnhancedPrompt, EnhancedPromptModel } from '../models/EnhancedPrompt';
import { AIClientFactory, AILogger, DeterministicIdGenerator } from './EnhancedDeepseekClient';
import { AIServiceError } from '../middleware/errorHandler';
import { IntentRouter } from './ContractEnforcer';
import { TextSanitizer, TokenBudgetManager } from './TextSanitizer';
import { config } from '../config/index';

export interface EnhancementResult {
  success: boolean;
  enhancedPrompt: EnhancedPrompt;
  processingTime: number;
  error?: string;
}

export class EnhancedPromptEnhancementService {
  private aiClient;
  private logger;

  constructor() {
    this.aiClient = AIClientFactory.createClient();
    this.logger = AILogger.getInstance();
  }

  async enhancePrompt(userInput: UserInput): Promise<EnhancedPrompt> {
    const startTime = Date.now();
    const promptId = DeterministicIdGenerator.generateShort();
    
    try {
      // Validate and create user input model
      const userInputModel = new UserInputModel(userInput);
      
      if (config.logging.enabled) {
        this.logger.log(promptId, 'enhancement_started', {
          mode: userInputModel.mode,
          promptLength: userInputModel.prompt.length,
          maxTokens: userInputModel.maxTokens
        });
      }

      // Check token budget
      const estimatedPromptTokens = TokenBudgetManager.estimateTokens(userInputModel.prompt);
      if (userInputModel.context) {
        const contextTokens = TokenBudgetManager.estimateTokens(userInputModel.context);
        estimatedPromptTokens + contextTokens;
      }
      
      if (estimatedPromptTokens > userInputModel.maxTokens * 0.8) {
        if (config.logging.enabled) {
          this.logger.log(promptId, 'token_budget_warning', {
            estimatedTokens: estimatedPromptTokens,
            maxTokens: userInputModel.maxTokens
          });
        }
      }

      // Use new enhanced client with task routing
      let aiResult;
      
      if (userInputModel.isLegacyMode()) {
        // Use legacy enhancement for backward compatibility
        aiResult = await this.legacyEnhancePrompt(userInputModel, promptId);
      } else {
        // Use new task routing enhancement
        aiResult = await this.enhancePromptWithTaskRouting(userInputModel, promptId);
      }

      const processingTime = Date.now() - startTime;

      // Create enhanced prompt model
      const enhancedPromptModel = new EnhancedPromptModel({
        originalPrompt: userInputModel.prompt,
        enhancedPrompt: aiResult.enhancedPrompt,
        mode: userInputModel.mode,
        improvements: aiResult.improvements,
        metadata: {
          processingTime,
          tokenUsage: {
            promptTokens: aiResult.usage.prompt_tokens,
            completionTokens: aiResult.usage.completion_tokens,
            totalTokens: aiResult.usage.total_tokens,
          },
          model: this.aiClient.getModelInfo().model,
          timestamp: new Date().toISOString(),
          taskMode: aiResult.taskMode,
          validationResult: aiResult.validationResult,
          attempts: aiResult.attempts,
          promptId,
          contractEnforced: aiResult.contractEnforced || false,
        },
      });

      if (config.logging.enabled) {
        this.logger.log(promptId, 'enhancement_completed', {
          processingTime,
          tokenUsage: aiResult.usage,
          taskMode: aiResult.taskMode,
          validationResult: aiResult.validationResult,
          attempts: aiResult.attempts
        });
      }

      return enhancedPromptModel;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (config.logging.enabled) {
        this.logger.log(promptId, 'enhancement_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime
        });
      }

      if (error instanceof AIServiceError) {
        throw error;
      }
      
      throw new AIServiceError(
        'Failed to enhance prompt',
        {
          originalPrompt: userInput.prompt,
          mode: userInput.mode,
          processingTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          promptId
        }
      );
    }
  }

  /**
   * Legacy enhancement for backward compatibility
   */
  private async legacyEnhancePrompt(userInputModel: UserInputModel, promptId: string) {
    if (config.logging.enabled) {
      this.logger.log(promptId, 'using_legacy_enhancement', { mode: userInputModel.mode });
    }
    
    // Use the legacy enhancement logic from the original client
    const language = TextSanitizer.sanitizeUserText(userInputModel.prompt).originalLanguage;
    
    const systemPrompts = {
      standard: `You are an AI prompt enhancement expert. Your task is to improve user prompts to make them more effective, clear, and specific while maintaining their original intent. IMPORTANT: You must respond in the same language as the original prompt. Provide the enhanced prompt and a list of specific improvements made in the same language as the original prompt.`,
      creative: `You are a creative writing and artistic prompt enhancement expert. Your task is to enhance prompts to unlock more imaginative, artistic, and creative responses while maintaining coherence and purpose. IMPORTANT: You must respond in the same language as the original prompt. Provide the enhanced prompt and a list of creative improvements made in the same language as the original prompt.`,
      technical: `You are a technical prompt enhancement expert specializing in precise specifications and technical accuracy. Your task is to enhance prompts to be more detailed, specific, and technically precise. IMPORTANT: You must respond in the same language as the original prompt. Provide the enhanced prompt and a list of technical improvements made in the same language as the original prompt.`,
      scientifically: `You are a scientific research and academic communication expert. Your task is to enhance prompts to be more academically rigorous, methodologically sound, and scientifically precise. Focus on incorporating proper scientific methodology, academic terminology, research-oriented language, and scholarly context. IMPORTANT: You must respond in the same language as the original prompt. Provide the enhanced prompt and a list of scientific improvements made in the same language as the original prompt.`,
    };

    const modeDescriptions = {
      standard: 'Standard enhancement for general purpose prompts',
      creative: 'Creative enhancement with imaginative and artistic elements',
      technical: 'Technical enhancement with precise and detailed specifications',
      scientifically: 'Scientific enhancement focusing on academic rigor and methodological precision',
    };
    
    const userPrompt = `Please enhance the following prompt for ${modeDescriptions[userInputModel.mode as keyof typeof modeDescriptions]}:

Original Prompt: "${userInputModel.prompt}"

Please provide:
1. An enhanced version of the prompt (respond in the same language as the original prompt)
2. A numbered list of specific improvements made (in the same language as the original prompt)

Format your response as:
ENHANCED PROMPT:
[Your enhanced prompt here]

IMPROVEMENTS:
1. [First improvement]
2. [Second improvement]
...`;

    const result = await this.aiClient.generateCompletionWithContract(
      {
        model: this.aiClient.getConfig().model,
        messages: [
          { role: 'system', content: systemPrompts[userInputModel.mode as keyof typeof systemPrompts] },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: userInputModel.maxTokens,
      },
      {
        mode: 'write',
        originalPrompt: userInputModel.prompt,
        enableContractEnforcement: false // Disable for legacy mode
      }
    );

    // Parse response
    const content = result.content;
    const enhancedPromptMatch = content.match(/ENHANCED PROMPT:\s*\n?([\s\S]*?)(?=\n\s*IMPROVEMENTS:|$)/i);
    const improvementsMatch = content.match(/IMPROVEMENTS:\s*\n?([\s\S]*?)$/i);

    const enhancedPrompt = enhancedPromptMatch && enhancedPromptMatch[1] ? enhancedPromptMatch[1].trim() : content;
    const improvementsText = improvementsMatch && improvementsMatch[1] ? improvementsMatch[1].trim() : '';
    
    const improvements = improvementsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+\.\s*.+/))
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .filter(Boolean);

    return {
      enhancedPrompt,
      improvements,
      usage: result.usage,
      taskMode: 'write',
      validationResult: result.validationResult,
      attempts: result.attempts,
      contractEnforced: false
    };
  }

  /**
   * New task routing enhancement
   */
  private async enhancePromptWithTaskRouting(userInputModel: UserInputModel, promptId: string) {
    if (config.logging.enabled) {
      this.logger.log(promptId, 'using_task_routing_enhancement', { 
        mode: userInputModel.mode,
        taskMode: userInputModel.getTaskMode()
      });
    }

    const result = await this.aiClient.enhancePromptWithTaskRouting(
      userInputModel.prompt,
      userInputModel.mode,
      userInputModel.maxTokens,
      userInputModel.context,
      userInputModel.language
    );

    return {
      enhancedPrompt: result.enhancedPrompt,
      improvements: result.improvements,
      usage: result.usage,
      taskMode: result.taskMode,
      validationResult: result.validationResult,
      attempts: result.attempts,
      contractEnforced: true
    };
  }

  async enhancePromptBatch(userInputs: UserInput[]): Promise<EnhancedPrompt[]> {
    const results: EnhancedPrompt[] = [];
    
    // Process prompts sequentially to avoid rate limiting
    for (const userInput of userInputs) {
      try {
        const enhancedPrompt = await this.enhancePrompt(userInput);
        results.push(enhancedPrompt);
      } catch (error) {
        console.error(`Failed to enhance prompt: ${userInput.prompt}`, error);
        // Continue with other prompts even if one fails
        continue;
      }
    }
    
    return results;
  }

  async getEnhancementSuggestions(userInput: UserInput): Promise<string[]> {
    try {
      const userInputModel = new UserInputModel(userInput);
      
      // Get AI suggestions for improving the prompt
      const suggestions = await this.getAISuggestions(userInputModel);
      
      return suggestions;
    } catch (error) {
      console.error('Failed to get enhancement suggestions:', error);
      return [];
    }
  }

  private async getAISuggestions(userInput: UserInputModel): Promise<string[]> {
    const suggestionsPrompt = `Analyze this prompt and provide 3-5 specific suggestions for improvement:

Prompt: "${userInput.prompt}"
Mode: ${userInput.mode}

Please provide suggestions in a numbered list format.`;

    try {
      const result = await this.aiClient.generateCompletionWithContract(
        {
          model: this.aiClient.getConfig().model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert in prompt engineering. Provide constructive suggestions to improve prompts.',
            },
            {
              role: 'user',
              content: suggestionsPrompt,
            },
          ],
          max_tokens: 500,
        },
        {
          mode: 'write',
          originalPrompt: userInput.prompt,
          enableContractEnforcement: false
        }
      );

      const content = result.content;
      if (!content) {
        return [];
      }

      // Parse suggestions from the response
      const suggestions = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^\d+\.\s*.+/))
        .map(line => line.replace(/^\d+\.\s*/, ''))
        .filter(Boolean);

      return suggestions;
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      return [];
    }
  }

  validatePrompt(prompt: string): { isValid: boolean; issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (!prompt || prompt.trim().length === 0) {
      issues.push('Prompt cannot be empty');
    }
    
    if (prompt.length < 5) {
      issues.push('Prompt is too short (minimum 5 characters)');
    }
    
    if (prompt.length > 50000) {
      issues.push('Prompt is too long (maximum 50000 characters)');
    }
    
    // Check for common issues
    if (prompt.includes('????') || prompt.includes('!!!!')) {
      warnings.push('Avoid excessive punctuation');
    }
    
    // Changed from hard validation to warning - only suggest punctuation for very short prompts
    if (prompt.trim().length < 20 && !/[.!?]$/.test(prompt.trim())) {
      warnings.push('Consider ending your prompt with proper punctuation for clarity');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  async getServiceStatus(): Promise<{
    available: boolean;
    model: string;
    lastError?: string;
  }> {
    try {
      const isAvailable = await this.aiClient.isAvailable();
      const modelInfo = this.aiClient.getModelInfo();
      
      return {
        available: isAvailable,
        model: modelInfo.model,
      };
    } catch (error) {
      return {
        available: false,
        model: this.aiClient.getModelInfo().model,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get AI logs for debugging
   */
  getLogs(promptId?: string): any[] {
    return this.logger.getLogs(promptId);
  }

  /**
   * Clear AI logs
   */
  clearLogs(): void {
    this.logger.clearLogs();
  }

  /**
   * Get current AI client configuration
   */
  getClientConfig() {
    return this.aiClient.getConfig();
  }

  /**
   * Get deterministic prompt ID for same input
   */
  getDeterministicPromptId(userInput: UserInput): string {
    const userInputModel = new UserInputModel(userInput);
    const { DeterministicIdGenerator } = require('./EnhancedDeepseekClient');
    return DeterministicIdGenerator.generate(
      userInputModel.prompt,
      userInputModel.getTaskMode(),
      this.aiClient.getConfig()
    );
  }
}