export type AIMode = 'standard' | 'creative' | 'technical' | 'scientifically';

export interface UserInput {
  prompt: string;
  mode: AIMode;
  context?: string;
  maxTokens?: number;
}

export interface EnhancedPrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  mode: AIMode;
  improvements: string[];
  metadata: {
    processingTime: number;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    details?: unknown;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}