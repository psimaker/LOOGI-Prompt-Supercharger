import axios, { AxiosInstance, AxiosError } from 'axios';
import { AIServiceError } from '../middleware/errorHandler';

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

export class DeepseekClient {
  private client: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultModel: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.baseURL = process.env.AI_API_URL || 'https://api.deepseek.com/v1';
    this.defaultModel = process.env.AI_MODEL || 'deepseek-chat';

    if (!this.apiKey) {
      throw new Error('AI_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as { error?: { message?: string } } | undefined;
          const message = data?.error?.message || error.message;
          
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
  }

  async generateCompletion(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.post<AIResponse>('/chat/completions', {
        ...request,
        model: request.model || this.defaultModel,
      });

      return response.data;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError('Failed to generate completion', error);
    }
  }

  async enhancePrompt(
    originalPrompt: string,
    mode: 'standard' | 'creative' | 'technical' | 'scientifically',
    maxTokens?: number,
    _language?: string
  ): Promise<{
    enhancedPrompt: string;
    improvements: string[];
    usage: AIResponse['usage'];
  }> {
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
    
    const userPrompt = `Please enhance the following prompt for ${modeDescriptions[mode]}:

Original Prompt: "${originalPrompt}"

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

    const request: AIRequest = {
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompts[mode],
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: maxTokens || 1000,
      temperature: 0.7,
      top_p: 0.9,
    };

    const response = await this.generateCompletion(request);
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new AIServiceError('No content generated from AI service');
    }

    // Parse the response to extract enhanced prompt and improvements
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
      usage: response.usage,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch (error) {
      return false;
    }
  }

  getModelInfo(): { model: string; baseURL: string } {
    return {
      model: this.defaultModel,
      baseURL: this.baseURL,
    };
  }
}