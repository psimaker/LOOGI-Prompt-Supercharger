import { OutputContract, ValidationResult } from './OutputValidators';
import { AIServiceError } from '../middleware/errorHandler';

export type TaskMode = 'code' | 'json' | 'translate' | 'summarize' | 'analysis' | 'plan' | 'recipe' | 'support' | 'marketing' | 'write' | 'table';

export interface ContractEnforcementResult {
  success: boolean;
  content: string;
  validationResult: ValidationResult;
  attempts: number;
  finalPromptId?: string;
}

export interface ContractEnforcementConfig {
  maxAttempts: number;
  enableAutoRetry: boolean;
  enableContractReminder: boolean;
}

export class ContractEnforcer {
  private readonly client: any; // Use any to accept both DeepseekClient and EnhancedDeepseekClient
  private readonly config: ContractEnforcementConfig;
  
  constructor(client: any, config: ContractEnforcementConfig = {
    maxAttempts: 2,
    enableAutoRetry: true,
    enableContractReminder: true
  }) {
    this.client = client;
    this.config = config;
  }
  
  /**
   * Enforce contract on AI-generated content with automatic re-prompting
   */
  async enforceContract(
    content: string,
    mode: TaskMode,
    originalPrompt: string,
    context?: string
  ): Promise<ContractEnforcementResult> {
    const validator = this.getValidator(mode);
    let currentContent = content;
    let attempts = 1;
    
    // Initial validation
    let validationResult = validator.validate(currentContent);
    
    // If valid, return immediately
    if (validationResult.isValid) {
      return {
        success: true,
        content: currentContent,
        validationResult,
        attempts
      };
    }
    
    // If contract enforcement is disabled, return as-is
    if (!this.config.enableAutoRetry) {
      return {
        success: false,
        content: currentContent,
        validationResult,
        attempts
      };
    }
    
    // Attempt to fix with re-prompting
    while (attempts < this.config.maxAttempts && !validationResult.isValid) {
      attempts++;
      
      try {
        const fixedContent = await this.rePromptForContractCompliance(
          currentContent,
          validationResult,
          validator,
          mode,
          originalPrompt,
          context
        );
        
        currentContent = fixedContent;
        validationResult = validator.validate(currentContent);
        
      } catch (error) {
        console.error(`Contract enforcement attempt ${attempts} failed:`, error);
        break;
      }
    }
    
    return {
      success: validationResult.isValid,
      content: currentContent,
      validationResult,
      attempts
    };
  }
  
  /**
   * Re-prompt the AI to fix contract violations
   */
  private async rePromptForContractCompliance(
    violatingContent: string,
    validationResult: ValidationResult,
    validator: OutputContract,
    mode: TaskMode,
    originalPrompt: string,
    context?: string
  ): Promise<string> {
    const contractReminder = this.config.enableContractReminder 
      ? validator.getRePromptInstruction() 
      : '';
    
    const violationsList = validationResult.violations.map(v => `- ${v}`).join('\n');
    
    const rePrompt = `CONTRACT VIOLATION DETECTED

Previous output (VIOLATES CONTRACT):
"""
${violatingContent}
"""

Contract violations:
${violationsList}

${contractReminder}

Original user request:
"""
${originalPrompt}
"""${context ? `\n\nAdditional context:\n"""\n${context}\n"""` : ''}

PRODUCE CORRECT OUTPUT THAT FULLY COMPLIES WITH THE CONTRACT ABOVE.
NO EXPLANATIONS. NO APOLOGIES. JUST THE CORRECT OUTPUT.`;

    const response = await this.client.generateCompletion({
      model: this.client.getModelInfo().model,
      messages: [
        {
          role: 'system',
          content: `You are a contract compliance specialist. Your ONLY job is to fix contract violations. ${validator.getContractDescription()}`
        },
        {
          role: 'user',
          content: rePrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistency
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AIServiceError('No content generated during contract enforcement');
    }
    
    return content.trim();
  }
  
  /**
   * Get appropriate validator for the task mode
   */
  private getValidator(mode: TaskMode): OutputContract {
    const { OutputValidatorFactory } = require('./OutputValidators');
    return OutputValidatorFactory.createValidator(mode);
  }
  
  /**
   * Validate content against contract without re-prompting
   */
  validateContent(content: string, mode: TaskMode): ValidationResult {
    const validator = this.getValidator(mode);
    return validator.validate(content);
  }
  
  /**
   * Get contract description for a specific mode
   */
  getContractDescription(mode: TaskMode): string {
    const validator = this.getValidator(mode);
    return validator.getContractDescription();
  }
}

/**
 * Intent router for deterministic task mode inference
 */
export class IntentRouter {
  /**
   * Deterministically infer task mode from prompt content
   */
  static inferTaskMode(prompt: string, userMode?: string): TaskMode {
    const lowerPrompt = prompt.toLowerCase().trim();
    
    // If user explicitly specified a mode, validate and use it
    if (userMode) {
      const validModes: TaskMode[] = ['code', 'json', 'translate', 'summarize', 'analysis', 'plan', 'recipe', 'support', 'marketing', 'write', 'table'];
      if (validModes.includes(userMode as TaskMode)) {
        return userMode as TaskMode;
      }
    }
    
    // Code detection
    const codeKeywords = ['code', 'programming', 'function', 'class', 'algorithm', 'script', 'compile', 'debug'];
    const hasCodeKeywords = codeKeywords.some(keyword => lowerPrompt.includes(keyword));
    const hasCodeBlock = prompt.includes('```') || prompt.includes('def ') || prompt.includes('function ') || prompt.includes('class ');
    
    if (hasCodeKeywords || hasCodeBlock) {
      return 'code';
    }
    
    // JSON detection
    const jsonKeywords = ['json', 'api', 'data structure', 'object', 'array'];
    if (jsonKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'json';
    }
    
    // Translation detection
    const translateKeywords = ['translate', 'übersetz', 'traduc', 'traduire', 'translation'];
    const languageIndicators = ['english', 'german', 'french', 'spanish', 'chinese', 'japanese'];
    
    if (translateKeywords.some(keyword => lowerPrompt.includes(keyword)) || 
        languageIndicators.some(lang => lowerPrompt.includes(lang))) {
      return 'translate';
    }
    
    // Summary detection
    const summaryKeywords = ['summarize', 'summary', 'tl;dr', 'abstract', 'overview', 'condense'];
    if (summaryKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'summarize';
    }
    
    // Analysis detection
    const analysisKeywords = ['analyze', 'analysis', 'evaluate', 'assess', 'examine', 'review'];
    if (analysisKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'analysis';
    }
    
    // Plan detection
    const planKeywords = ['plan', 'strategy', 'approach', 'method', 'steps', 'procedure'];
    if (planKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'plan';
    }
    
    // Recipe detection
    const recipeKeywords = ['recipe', 'how to', 'instructions', 'guide', 'tutorial', 'steps'];
    if (recipeKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'recipe';
    }
    
    // Table detection
    const tableKeywords = ['table', 'list', 'compare', 'comparison', 'columns', 'rows'];
    if (tableKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'table';
    }
    
    // Support detection
    const supportKeywords = ['help', 'support', 'assist', 'problem', 'issue', 'error', 'fix'];
    if (supportKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'support';
    }
    
    // Marketing detection
    const marketingKeywords = ['marketing', 'advertising', 'promotion', 'campaign', 'sales', 'copy'];
    if (marketingKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'marketing';
    }
    
    // Default to write mode
    return 'write';
  }
  
  /**
   * Get deterministic role template for a task mode
   */
  static getRoleTemplate(mode: TaskMode): string {
    const roles = {
      code: 'Senior Software Engineer with 10+ years experience in multiple programming languages. Expert in clean code, best practices, and performance optimization.',
      json: 'Data Engineer specializing in JSON APIs and data structures. Expert in schema design and data validation.',
      translate: 'Professional translator fluent in multiple languages. Expert in cultural context and accurate translation.',
      summarize: 'Professional editor and content strategist. Expert in concise communication and key point extraction.',
      analysis: 'Senior Business Analyst with expertise in data analysis and strategic evaluation.',
      plan: 'Project Manager and strategic planner with expertise in detailed execution planning.',
      recipe: 'Professional chef and culinary instructor with expertise in clear, actionable recipes.',
      support: 'Technical Support Specialist with expertise in clear problem-solving communication.',
      marketing: 'Marketing Professional with expertise in persuasive copywriting and campaign strategy.',
      write: 'Professional writer and editor with expertise in clear, engaging content creation.',
      table: 'Data Analyst specializing in structured data presentation and comparison tables.'
    };
    
    return roles[mode] || roles.write;
  }
  
  /**
   * Get specific contract rules for a task mode
   */
  static getContractRules(mode: TaskMode): string[] {
    const rules = {
      code: [
        'Provide ONLY the code block with no explanation',
        'Use proper syntax and best practices',
        'Include necessary imports/dependencies',
        'Add error handling where appropriate',
        'Follow language conventions',
        'Optimize for readability and performance'
      ],
      json: [
        'Provide ONLY valid JSON',
        'No markdown or formatting',
        'Use proper data types',
        'Follow JSON schema conventions',
        'No comments or explanations',
        'Ensure valid syntax'
      ],
      translate: [
        'Provide ONLY the translation',
        'Maintain original meaning',
        'Use natural language flow',
        'Consider cultural context',
        'No explanation needed',
        'Preserve tone when possible'
      ],
      summarize: [
        'Provide ONLY the summary',
        'Keep it concise but complete',
        'Highlight key points',
        'Use clear language',
        'Maintain logical flow',
        'No personal commentary'
      ],
      analysis: [
        'Start with TL;DR section',
        'Use H2/H3 headings',
        'Provide numbered steps',
        'Be objective and factual',
        'Include actionable insights',
        'No unnecessary prose'
      ],
      plan: [
        'Start with TL;DR section',
        'Use H2/H3 headings',
        'Provide numbered steps',
        'Be specific and detailed',
        'Include timelines where relevant',
        'Focus on actionable items'
      ],
      recipe: [
        'Start with TL;DR section',
        'Use H2/H3 headings',
        'Provide numbered steps',
        'Include ingredients list',
        'Be clear and specific',
        'Include timing information'
      ],
      support: [
        'Provide ONLY the solution',
        'Be clear and direct',
        'Include step-by-step instructions',
        'Anticipate common issues',
        'Use simple language',
        'Focus on problem resolution'
      ],
      marketing: [
        'Provide ONLY the marketing copy',
        'Be persuasive and engaging',
        'Know your audience',
        'Include clear call-to-action',
        'Use compelling language',
        'Focus on benefits'
      ],
      write: [
        'Be clear and engaging',
        'Use appropriate tone',
        'Structure content logically',
        'Provide value to reader',
        'Maintain consistency',
        'Focus on readability'
      ],
      table: [
        'Provide ONLY the markdown table',
        'Use proper table formatting',
        'Include header row',
        'Align columns properly',
        'Keep data organized',
        'No explanation needed'
      ]
    };
    
    return rules[mode] || rules.write;
  }
}