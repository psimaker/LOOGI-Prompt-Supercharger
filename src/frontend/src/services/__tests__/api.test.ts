import axios from 'axios';
import { apiService } from '../api';
import { UserInput, EnhancedPrompt } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      post: jest.fn(),
      get: jest.fn(),
    } as any);
  });

  describe('enhancePrompt', () => {
    it('should successfully enhance a prompt', async () => {
      const mockResponse = {
        data: {
          originalPrompt: 'Test prompt',
          enhancedPrompt: 'Enhanced test prompt',
          mode: 'standard' as const,
          improvements: ['Added context', 'Improved clarity'],
          metadata: {
            processingTime: 1000,
            tokenUsage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30,
            },
            model: 'deepseek-chat',
            timestamp: new Date().toISOString(),
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      const result = await apiService.enhancePrompt(input);

      expect(mockClient.post).toHaveBeenCalledWith('/enhance', input);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid prompt',
              statusCode: 400,
              timestamp: new Date().toISOString(),
              path: '/api/enhance',
              method: 'POST',
              details: [
                { field: 'prompt', message: 'Prompt is required' },
              ],
            },
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockRejectedValue(mockError);

      const input: UserInput = {
        prompt: '',
        mode: 'standard',
      };

      await expect(apiService.enhancePrompt(input)).rejects.toThrow('Invalid prompt');
    });

    it('should handle network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error',
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockRejectedValue(mockError);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      await expect(apiService.enhancePrompt(input)).rejects.toThrow('Network error: Unable to connect to the server');
    });

    it('should handle unexpected errors', async () => {
      const mockError = new Error('Unexpected error');

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockRejectedValue(mockError);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      await expect(apiService.enhancePrompt(input)).rejects.toThrow('An unexpected error occurred');
    });

    it('should include optional context and maxTokens', async () => {
      const mockResponse = {
        data: {
          originalPrompt: 'Test prompt',
          enhancedPrompt: 'Enhanced test prompt',
          mode: 'standard' as const,
          improvements: ['Added context'],
          metadata: {
            processingTime: 1000,
            tokenUsage: {
              promptTokens: 10,
              completionTokens: 15,
              totalTokens: 25,
            },
            model: 'deepseek-chat',
            timestamp: new Date().toISOString(),
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
        context: 'Additional context',
        maxTokens: 100,
      };

      const result = await apiService.enhancePrompt(input);

      expect(mockClient.post).toHaveBeenCalledWith('/enhance', input);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('checkHealth', () => {
    it('should successfully check health status', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600,
          version: '1.0.0',
          environment: 'test',
          dependencies: {
            database: 'connected',
            aiService: 'available',
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiService.checkHealth();

      expect(mockClient.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle health check errors', async () => {
      const mockError = new Error('Health check failed');

      const mockClient = mockedAxios.create();
      (mockClient.get as jest.Mock).mockRejectedValue(mockError);

      await expect(apiService.checkHealth()).rejects.toThrow('Health check failed');
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is available', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600,
          version: '1.0.0',
          environment: 'test',
          dependencies: {
            database: 'connected',
            aiService: 'available',
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiService.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when service is unavailable', async () => {
      const mockError = new Error('Service unavailable');

      const mockClient = mockedAxios.create();
      (mockClient.get as jest.Mock).mockRejectedValue(mockError);

      const result = await apiService.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('Request Configuration', () => {
    it('should create axios client with correct configuration', () => {
      const createSpy = mockedAxios.create;
      
      // Create a new instance to trigger the constructor
      const service = new (apiService.constructor as any)();
      
      expect(createSpy).toHaveBeenCalledWith({
        baseURL: expect.stringContaining('/api'),
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should add request and response interceptors', () => {
      const mockClient = mockedAxios.create();
      
      // Create a new instance to trigger the constructor
      const service = new (apiService.constructor as any)();
      
      expect(mockClient.interceptors.request.use).toHaveBeenCalled();
      expect(mockClient.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Error Response Handling', () => {
    it('should handle structured API errors', async () => {
      const mockError = {
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded',
              statusCode: 429,
              timestamp: new Date().toISOString(),
              path: '/api/enhance',
              method: 'POST',
              details: {
                retryAfter: 60,
              },
            },
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockRejectedValue(mockError);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      await expect(apiService.enhancePrompt(input)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle HTTP status errors', async () => {
      const mockError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockRejectedValue(mockError);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      await expect(apiService.enhancePrompt(input)).rejects.toThrow('HTTP 503: Service Unavailable');
    });

    it('should include error details in custom error objects', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Validation failed',
              statusCode: 400,
              timestamp: new Date().toISOString(),
              path: '/api/enhance',
              method: 'POST',
              details: [
                { field: 'prompt', message: 'Prompt is too short' },
              ],
            },
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockRejectedValue(mockError);

      const input: UserInput = {
        prompt: 'Hi',
        mode: 'standard',
      };

      try {
        await apiService.enhancePrompt(input);
      } catch (error: any) {
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(400);
        expect(error.details).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      const mockResponse = {
        data: {},
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      const result = await apiService.enhancePrompt(input);

      expect(result).toEqual({});
    });

    it('should handle null response data', async () => {
      const mockResponse = {
        data: null,
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const input: UserInput = {
        prompt: 'Test prompt',
        mode: 'standard',
      };

      const result = await apiService.enhancePrompt(input);

      expect(result).toBeNull();
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'This is a test prompt. '.repeat(100);
      
      const mockResponse = {
        data: {
          originalPrompt: longPrompt,
          enhancedPrompt: 'Enhanced version of long prompt',
          mode: 'standard' as const,
          improvements: ['Improved clarity'],
          metadata: {
            processingTime: 2000,
            tokenUsage: {
              promptTokens: 500,
              completionTokens: 100,
              totalTokens: 600,
            },
            model: 'deepseek-chat',
            timestamp: new Date().toISOString(),
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const input: UserInput = {
        prompt: longPrompt,
        mode: 'standard',
      };

      const result = await apiService.enhancePrompt(input);

      expect(result.originalPrompt).toBe(longPrompt);
    });

    it('should handle special characters in prompts', async () => {
      const specialPrompt = 'Test with special chars: @#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      
      const mockResponse = {
        data: {
          originalPrompt: specialPrompt,
          enhancedPrompt: 'Enhanced special chars prompt',
          mode: 'standard' as const,
          improvements: ['Handled special characters'],
          metadata: {
            processingTime: 1000,
            tokenUsage: {
              promptTokens: 20,
              completionTokens: 30,
              totalTokens: 50,
            },
            model: 'deepseek-chat',
            timestamp: new Date().toISOString(),
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const input: UserInput = {
        prompt: specialPrompt,
        mode: 'standard',
      };

      const result = await apiService.enhancePrompt(input);

      expect(result.originalPrompt).toBe(specialPrompt);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const mockResponse = {
        data: {
          originalPrompt: 'Test prompt',
          enhancedPrompt: 'Enhanced test prompt',
          mode: 'standard' as const,
          improvements: ['Improved'],
          metadata: {
            processingTime: 1000,
            tokenUsage: {
              promptTokens: 10,
              completionTokens: 15,
              totalTokens: 25,
            },
            model: 'deepseek-chat',
            timestamp: new Date().toISOString(),
          },
        },
      };

      const mockClient = mockedAxios.create();
      (mockClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        const input: UserInput = {
          prompt: `Test prompt ${i}`,
          mode: 'standard',
        };
        promises.push(apiService.enhancePrompt(input));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.originalPrompt).toBe(`Test prompt ${index}`);
      });
    });
  });

  describe('Configuration', () => {
    it('should use environment variable for API URL', () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'http://custom-api:3001/api';
      
      const createSpy = mockedAxios.create;
      
      // Create a new instance to trigger the constructor
      const service = new (apiService.constructor as any)();
      
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom-api:3001/api',
        })
      );
      
      // Restore original env
      if (originalEnv) {
        process.env.REACT_APP_API_URL = originalEnv;
      } else {
        delete process.env.REACT_APP_API_URL;
      }
    });
  });
});