import { UserInput, UserInputModel } from '../models/UserInput';
import { EnhancedPrompt, EnhancedPromptModel } from '../models/EnhancedPrompt';
import { DeepseekClient } from './DeepseekClient';
import { AIServiceError } from '../middleware/errorHandler';

export interface EnhancementResult {
  success: boolean;
  enhancedPrompt: EnhancedPrompt;
  processingTime: number;
  error?: string;
}

export class PromptEnhancementService {
  private aiClient: DeepseekClient;

  constructor() {
    this.aiClient = new DeepseekClient();
  }

  async enhancePrompt(userInput: UserInput): Promise<EnhancedPrompt> {
    const startTime = Date.now();
    
    try {
      // Validate and create user input model
      const userInputModel = new UserInputModel(userInput);
      
      // Call AI service to enhance the prompt - let AI handle language detection
      const aiResult = await this.aiClient.enhancePrompt(
        userInputModel.prompt,
        userInputModel.mode as any, // Cast to handle both legacy and new modes
        userInputModel.maxTokens
      );

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
          attempts: 1,
          contractEnforced: false,
        },
      });

      return enhancedPromptModel;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      const processingTime = Date.now() - startTime;
      throw new AIServiceError(
        'Failed to enhance prompt',
        {
          originalPrompt: userInput.prompt,
          mode: userInput.mode,
          processingTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }
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
      const result = await this.aiClient.generateCompletion({
        model: this.aiClient.getModelInfo().model,
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
        temperature: 0.5,
      });

      const content = result.choices[0]?.message?.content;
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
}