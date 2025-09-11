import { z } from 'zod';

// Legacy modes for backward compatibility
export const LegacyAIModeSchema = z.enum(['standard', 'creative', 'technical', 'scientifically']);
export type LegacyAIMode = z.infer<typeof LegacyAIModeSchema>;

// New task modes
export const TaskModeSchema = z.enum([
  'code', 'json', 'translate', 'summarize', 'analysis', 'plan', 'recipe', 
  'support', 'marketing', 'write', 'table', 'standard', 'creative', 'technical', 'scientifically'
]);
export type TaskMode = z.infer<typeof TaskModeSchema>;

export const UserInputSchema = z.object({
  prompt: z.string().min(1).max(50000),
  mode: TaskModeSchema.default('standard'),
  context: z.string().optional(),
  maxTokens: z.number().int().min(100).max(4000).default(2000),
  language: z.string().optional(),
  enableContractEnforcement: z.boolean().default(true),
  targetLanguage: z.string().optional(), // For translation tasks
  codeLanguage: z.string().optional(), // For code tasks
});

export type UserInput = z.infer<typeof UserInputSchema>;

export class UserInputModel implements UserInput {
  public readonly prompt: string;
  public readonly mode: TaskMode;
  public readonly context?: string;
  public readonly maxTokens: number;
  public readonly language?: string;
  public readonly enableContractEnforcement: boolean;
  public readonly targetLanguage?: string;
  public readonly codeLanguage?: string;
  public readonly id: string;
  public readonly createdAt: Date;
  public readonly hash: string;

  constructor(data: UserInput) {
    const validated = UserInputSchema.parse(data);
    this.prompt = validated.prompt;
    this.mode = validated.mode;
    this.context = validated.context;
    this.maxTokens = validated.maxTokens;
    this.language = validated.language;
    this.enableContractEnforcement = validated.enableContractEnforcement;
    this.targetLanguage = validated.targetLanguage;
    this.codeLanguage = validated.codeLanguage;
    this.id = this.generateId();
    this.hash = this.generateHash();
    this.createdAt = new Date();
  }

  private generateId(): string {
    return `user_input_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateHash(): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      prompt: this.prompt,
      mode: this.mode,
      context: this.context,
      maxTokens: this.maxTokens,
      language: this.language,
      targetLanguage: this.targetLanguage,
      codeLanguage: this.codeLanguage
    }));
    return hash.digest('hex').substring(0, 16);
  }

  public toJSON(): UserInput {
    return {
      prompt: this.prompt,
      mode: this.mode,
      context: this.context,
      maxTokens: this.maxTokens,
      language: this.language,
      enableContractEnforcement: this.enableContractEnforcement,
      targetLanguage: this.targetLanguage,
      codeLanguage: this.codeLanguage,
    };
  }

  public getPromptWithContext(): string {
    if (this.context) {
      return `Context: ${this.context}\n\nPrompt: ${this.prompt}`;
    }
    return this.prompt;
  }

  public getModeDescription(): string {
    const modeDescriptions = {
      code: 'Generate code with strict formatting requirements',
      json: 'Generate valid JSON data structures',
      translate: 'Translate text between languages',
      summarize: 'Create concise summaries of content',
      analysis: 'Provide structured analysis with TL;DR',
      plan: 'Create detailed execution plans',
      recipe: 'Provide step-by-step instructions',
      support: 'Provide technical support solutions',
      marketing: 'Create persuasive marketing content',
      write: 'Generate general written content',
      table: 'Create structured comparison tables',
      standard: 'Standard enhancement for general purpose prompts',
      creative: 'Creative enhancement with imaginative and artistic elements',
      technical: 'Technical enhancement with precise and detailed specifications',
      scientifically: 'Scientific enhancement focusing on academic rigor and methodological precision'
    };
    return modeDescriptions[this.mode] || modeDescriptions.standard;
  }

  public isLegacyMode(): boolean {
    return ['standard', 'creative', 'technical', 'scientifically'].includes(this.mode);
  }

  public getTaskMode(): TaskMode {
    return this.mode;
  }
}