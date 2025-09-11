import axios, { AxiosInstance, AxiosError } from 'axios';
import { UserInput, EnhancedPrompt, ApiError } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    // Für Entwicklung mit Proxy, für Produktion direkte API-URL
    const backendPort = process.env.REACT_APP_BACKEND_PORT || '3001';
    
    // Verwende Docker-Hostname wenn verfügbar, sonst localhost
    const backendHost = process.env.REACT_APP_BACKEND_HOST || 'localhost';
    const baseURL = process.env.NODE_ENV === 'production' 
      ? process.env.REACT_APP_API_URL || `http://${backendHost}:${backendPort}/api`
      : '/api';
    
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 120000, // Erhöht auf 120 Sekunden für lange Prompts
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth headers here if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError<ApiError>) => {
        if (error.response?.data?.error) {
          // Use the structured error from the API
          const apiError = error.response.data.error;
          const customError = new Error(apiError.message);
          (customError as any).statusCode = apiError.statusCode;
          (customError as any).details = apiError.details;
          throw customError;
        } else if (error.response) {
          // Fallback for non-API errors
          throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
          // Network error - detailliertere Fehlerbehandlung
          if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout: The server is taking too long to respond. Please try again or shorten your prompt.');
          } else if (error.message?.includes('timeout')) {
            throw new Error('Connection timeout: Please check your connection or try again with a shorter prompt.');
          } else {
            throw new Error('Network error: Unable to connect to the server. Please check your connection and try again.');
          }
        } else {
          // Other errors
          throw new Error('An unexpected error occurred');
        }
      }
    );
  }

  async enhancePrompt(input: UserInput): Promise<EnhancedPrompt> {
    try {
      const response = await this.client.post<EnhancedPrompt>('/enhance', input);
      return response.data;
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Utility method to check if the API is available
  async isAvailable(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;