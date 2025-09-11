import { z } from 'zod';
import { TaskMode, LegacyAIMode } from './UserInput';

export const EnhancedPromptSchema = z.object({
  originalPrompt: z.string().min(1),
  enhancedPrompt: z.string().min(1),
  mode: z.enum(['standard', 'creative', 'technical', 'scientifically', 'code', 'json', 'translate', 'summarize', 'analysis', 'plan', 'recipe', 'support', 'marketing', 'write', 'table']),
  improvements: z.array(z.string()),
  metadata: z.object({
    processingTime: z.number().positive(),
    tokenUsage: z.object({
      promptTokens: z.number().int().nonnegative(),
      completionTokens: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    }),
    model: z.string(),
    timestamp: z.string().datetime(),
    taskMode: z.string().optional(),
    validationResult: z.object({
      isValid: z.boolean(),
      violations: z.array(z.string()),
    }).optional(),
    attempts: z.number().int().min(1).default(1),
    promptId: z.string().optional(),
    contractEnforced: z.boolean().default(false),
  }),
});

export type EnhancedPrompt = z.infer<typeof EnhancedPromptSchema>;

export class EnhancedPromptModel implements EnhancedPrompt {
  public readonly originalPrompt: string;
  public readonly enhancedPrompt: string;
  public readonly mode: TaskMode | LegacyAIMode;
  public readonly improvements: string[];
  public readonly metadata: EnhancedPrompt['metadata'];
  public readonly id: string;

  constructor(data: EnhancedPrompt) {
    const validated = EnhancedPromptSchema.parse(data);
    this.originalPrompt = validated.originalPrompt;
    this.enhancedPrompt = validated.enhancedPrompt;
    this.mode = validated.mode;
    this.improvements = validated.improvements;
    this.metadata = validated.metadata;
    this.id = this.generateId();
  }

  private generateId(): string {
    return `enhanced_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  public toJSON(): EnhancedPrompt {
    return {
      originalPrompt: this.originalPrompt,
      enhancedPrompt: this.enhancedPrompt,
      mode: this.mode,
      improvements: this.improvements,
      metadata: this.metadata,
    };
  }

  public getCharacterCount(): number {
    return this.enhancedPrompt.length;
  }

  public getWordCount(): number {
    return this.enhancedPrompt.split(/\s+/).filter(word => word.length > 0).length;
  }

  public getImprovementCount(): number {
    return this.improvements.length;
  }

  public getProcessingTime(): number {
    return this.metadata.processingTime;
  }

  public getTokenUsage() {
    return this.metadata.tokenUsage;
  }

  public getEnhancementRatio(): number {
    return this.enhancedPrompt.length / this.originalPrompt.length;
  }

  public getFormattedImprovements(): string {
    return this.improvements.map((improvement, index) => `${index + 1}. ${improvement}`).join('\n');
  }

  public toString(): string {
    return this.enhancedPrompt;
  }

  public getValidationSummary(): string {
    if (this.metadata.validationResult) {
      return this.metadata.validationResult.isValid 
        ? '✅ Contract validated successfully'
        : `❌ Contract violations: ${this.metadata.validationResult.violations.join(', ')}`;
    }
    return 'No validation performed';
  }

  public getContractEnforcementSummary(): string {
    if (this.metadata.contractEnforced) {
      return `Contract enforced in ${this.metadata.attempts} attempt(s)`;
    }
    return 'Contract enforcement disabled';
  }
}