export type TaskMode = 'code' | 'json' | 'translate' | 'summarize' | 'analysis' | 'plan' | 'recipe' | 'support' | 'marketing' | 'write' | 'table';

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  suggestedFix?: string;
}

export interface OutputContract {
  validate(content: string): ValidationResult;
  getContractDescription(): string;
  getRePromptInstruction(): string;
}

/**
 * Code output validator - must contain exactly one ```<lang>``` block
 */
export class CodeOutputValidator implements OutputContract {
  private readonly language?: string;
  
  constructor(language?: string) {
    this.language = language;
  }
  
  validate(content: string): ValidationResult {
    // Remove leading/trailing whitespace
    content = content.trim();
    
    // Check for exactly one code block
    const codeBlockRegex = /^```(\w+)?\n([\s\S]*?)\n```$/;
    const match = content.match(codeBlockRegex);
    
    if (!match) {
      // Check if there are multiple code blocks
      const multipleBlocks = content.match(/```[\s\S]*?```/g);
      if (multipleBlocks && multipleBlocks.length > 1) {
        return {
          isValid: false,
          violations: ['Multiple code blocks detected. Only one code block allowed.'],
          suggestedFix: 'Provide exactly one code block with proper formatting.'
        };
      }
      
      // Check if there are any prose elements
      if (content.includes('Here is') || content.includes('This code') || content.includes('The following')) {
        return {
          isValid: false,
          violations: ['Prose detected before/after code block. Only code block allowed.'],
          suggestedFix: 'Remove all prose and provide only the code block.'
        };
      }
      
      return {
        isValid: false,
        violations: ['No properly formatted code block found.'],
        suggestedFix: 'Provide exactly one code block with proper formatting.'
      };
    }
    
    // Check language if specified
    if (this.language && match[1] !== this.language) {
      return {
        isValid: false,
        violations: [`Language mismatch. Expected: ${this.language}, Found: ${match[1] || 'none'}`],
        suggestedFix: `Use code block with language: \`\`\`${this.language}`
      };
    }
    
    // Validate code content is not empty
    const codeContent = match[2]?.trim();
    if (!codeContent) {
      return {
        isValid: false,
        violations: ['Code block is empty.'],
        suggestedFix: 'Provide actual code content in the code block.'
      };
    }
    
    return {
      isValid: true,
      violations: []
    };
  }
  
  getContractDescription(): string {
    return `Output must be exactly one code block (\`\`\`${this.language || '<language>'}) with no prose before or after.`;
  }
  
  getRePromptInstruction(): string {
    return `CRITICAL: Provide ONLY the code block with no introduction, explanation, or conclusion. No prose allowed.`;
  }
}

/**
 * JSON output validator - must be valid JSON only
 */
export class JsonOutputValidator implements OutputContract {
  validate(content: string): ValidationResult {
    content = content.trim();
    
    // Check for any prose or markdown
    if (content.includes('Here is') || content.includes('This JSON') || content.includes('The following') || content.includes('```')) {
      return {
        isValid: false,
        violations: ['Prose or markdown detected. Only JSON allowed.'],
        suggestedFix: 'Remove all text and provide only valid JSON.'
      };
    }
    
    // Try to parse as JSON
    try {
      JSON.parse(content);
      return {
        isValid: true,
        violations: []
      };
    } catch (error) {
      return {
        isValid: false,
        violations: ['Invalid JSON format.'],
        suggestedFix: 'Provide valid JSON without any additional text.'
      };
    }
  }
  
  getContractDescription(): string {
    return 'Output must be valid JSON only, no prose or markdown.';
  }
  
  getRePromptInstruction(): string {
    return 'CRITICAL: Provide ONLY valid JSON. No text, no markdown, no explanation.';
  }
}

/**
 * Translate/summarize output validator - only target text
 */
export class TextOnlyValidator implements OutputContract {
  validate(content: string): ValidationResult {
    content = content.trim();
    
    // Check for any meta text
    const metaPatterns = [
      /^(Here is|This is|Translation:|Summary:|Note:|Please note)/i,
      /(translation|summary|result|output):/i,
      /```/,
      /^\d+\./, // Numbered lists
      /^[-*]\s+/ // Bullet points
    ];
    
    for (const pattern of metaPatterns) {
      if (pattern.test(content)) {
        return {
          isValid: false,
          violations: ['Meta text or formatting detected. Only target text allowed.'],
          suggestedFix: 'Provide only the translated/summarized text without any introduction or formatting.'
        };
      }
    }
    
    // Check if content is too short (likely not a proper translation/summary)
    if (content.length < 10) {
      return {
        isValid: false,
        violations: ['Text too short. Provide complete translation/summary.'],
        suggestedFix: 'Provide the full translated or summarized text.'
      };
    }
    
    return {
      isValid: true,
      violations: []
    };
  }
  
  getContractDescription(): string {
    return 'Output must be only the target text, no meta commentary or formatting.';
  }
  
  getRePromptInstruction(): string {
    return 'CRITICAL: Provide ONLY the text itself. No introduction, no notes, no formatting.';
  }
}

/**
 * Analysis/plan/recipe output validator - TL;DR + H2/H3 + numbered steps
 */
export class StructuredContentValidator implements OutputContract {
  validate(content: string): ValidationResult {
    content = content.trim();
    
    // Check for TL;DR section
    const tldrRegex = /^##?\s*TL;DR[\s\S]*?(?=\n##?\s)/m;
    const hasTldr = tldrRegex.test(content);
    
    // Check for numbered steps
    const numberedSteps = content.match(/^\d+\./gm);
    const hasNumberedSteps = numberedSteps && numberedSteps.length >= 3;
    
    // Check for H2/H3 headings
    const headings = content.match(/^##?\s+.+/gm);
    const hasHeadings = headings && headings.length >= 2;
    
    const violations: string[] = [];
    
    if (!hasTldr) {
      violations.push('Missing TL;DR section.');
    }
    
    if (!hasNumberedSteps) {
      violations.push('Missing numbered steps (minimum 3 required).');
    }
    
    if (!hasHeadings) {
      violations.push('Missing H2/H3 headings (minimum 2 required).');
    }
    
    // Check for excessive meta text
    const metaPatterns = [
      /(Here is|This is|Below is|Following is)/i,
      /(analysis|plan|recipe):/i
    ];
    
    for (const pattern of metaPatterns) {
      if (pattern.test(content)) {
        violations.push('Excessive meta text detected.');
        break;
      }
    }
    
    if (violations.length > 0) {
      return {
        isValid: false,
        violations,
        suggestedFix: 'Structure content with TL;DR section, H2/H3 headings, and numbered steps.'
      };
    }
    
    return {
      isValid: true,
      violations: []
    };
  }
  
  getContractDescription(): string {
    return 'Output must have TL;DR section, H2/H3 headings, and numbered steps.';
  }
  
  getRePromptInstruction(): string {
    return 'CRITICAL: Structure with TL;DR, H2/H3 headings, and numbered steps. No meta text.';
  }
}

/**
 * Table output validator - markdown table format
 */
export class TableOutputValidator implements OutputContract {
  validate(content: string): ValidationResult {
    content = content.trim();
    
    // Check for markdown table format
    const tableRegex = /^\|.*\|$/m;
    const separatorRegex = /^\|[-:\s]+\|$/m;
    
    const hasTableFormat = tableRegex.test(content);
    const hasSeparator = separatorRegex.test(content);
    
    if (!hasTableFormat || !hasSeparator) {
      return {
        isValid: false,
        violations: ['Invalid table format. Must be markdown table with header and separator.'],
        suggestedFix: 'Provide proper markdown table format with header row and separator.'
      };
    }
    
    // Check for meta text
    if (content.includes('Here is') || content.includes('Table:') || content.includes('This table')) {
      return {
        isValid: false,
        violations: ['Meta text detected. Only table allowed.'],
        suggestedFix: 'Provide only the markdown table without any introduction.'
      };
    }
    
    return {
      isValid: true,
      violations: []
    };
  }
  
  getContractDescription(): string {
    return 'Output must be valid markdown table format only.';
  }
  
  getRePromptInstruction(): string {
    return 'CRITICAL: Provide ONLY the markdown table. No text, no introduction.';
  }
}

/**
 * Factory for creating appropriate validator based on task mode
 */
export class OutputValidatorFactory {
  static createValidator(mode: TaskMode, language?: string): OutputContract {
    switch (mode) {
      case 'code':
        return new CodeOutputValidator(language);
      case 'json':
        return new JsonOutputValidator();
      case 'translate':
      case 'summarize':
        return new TextOnlyValidator();
      case 'analysis':
      case 'plan':
      case 'recipe':
        return new StructuredContentValidator();
      case 'table':
        return new TableOutputValidator();
      case 'support':
      case 'marketing':
      case 'write':
        return new TextOnlyValidator(); // Default to text-only for these modes
      default:
        return new TextOnlyValidator();
    }
  }
}