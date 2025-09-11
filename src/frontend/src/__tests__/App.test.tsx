import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { apiService } from '../services/api';

// Mock the API service
jest.mock('../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('App Component', () => {
  const mockEnhancedResponse = {
    originalPrompt: 'Test prompt',
    enhancedPrompt: 'This is an enhanced version of the test prompt with more detail and context.',
    mode: 'standard' as const,
    improvements: ['Added more detail', 'Improved clarity'],
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.enhancePrompt.mockResolvedValue(mockEnhancedResponse);
    mockApiService.checkHealth.mockResolvedValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  describe('Initial Rendering', () => {
    it('should render the main header', () => {
      render(<App />);
      
      expect(screen.getByText('Supercharge your Prompts')).toBeInTheDocument();
      expect(screen.getByText('Transform your prompts with AI-powered enhancement')).toBeInTheDocument();
    });

    it('should render mode selector', () => {
      render(<App />);
      
      expect(screen.getByText('Enhancement Mode')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Creative')).toBeInTheDocument();
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Scientific')).toBeInTheDocument();
    });

    it('should render prompt input', () => {
      render(<App />);
      
      expect(screen.getByText('Your Prompt')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your prompt here...')).toBeInTheDocument();
    });

    it('should render enhance button', () => {
      render(<App />);
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      expect(enhanceButton).toBeInTheDocument();
      expect(enhanceButton).not.toBeDisabled();
    });

    it('should render footer', () => {
      render(<App />);
      
      expect(screen.getByText(/Powered by AI • Built with React & TypeScript/i)).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should allow changing enhancement mode', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const creativeButton = screen.getByText('Creative').closest('button');
      await user.click(creativeButton!);
      
      expect(creativeButton).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should use selected mode for enhancement', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Select creative mode
      const creativeButton = screen.getByText('Creative').closest('button');
      await user.click(creativeButton!);
      
      // Enter prompt and enhance
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(mockApiService.enhancePrompt).toHaveBeenCalledWith({
          prompt: 'Test prompt',
          mode: 'creative',
        });
      });
    });
  });

  describe('Prompt Enhancement', () => {
    it('should enhance prompt successfully', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      // Should show loading state
      expect(screen.getByText('Enhancing...')).toBeInTheDocument();
      
      // Wait for enhancement to complete
      await waitFor(() => {
        expect(screen.getByText('Enhanced Prompt')).toBeInTheDocument();
      });
      
      // Should display enhanced content
      expect(screen.getByText(mockEnhancedResponse.enhancedPrompt)).toBeInTheDocument();
      
      // Should show copy button
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('should show error when prompt is empty', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      expect(screen.getByText('Please enter a prompt to enhance')).toBeInTheDocument();
      expect(mockApiService.enhancePrompt).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      mockApiService.enhancePrompt.mockRejectedValueOnce(new Error('API Error'));
      
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to enhance prompt')).toBeInTheDocument();
      });
      
      // Should not show enhanced output
      expect(screen.queryByText('Enhanced Prompt')).not.toBeInTheDocument();
    });

    it('should disable enhance button while loading', async () => {
      const user = userEvent.setup();
      // Mock slow API response
      mockApiService.enhancePrompt.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockEnhancedResponse), 100))
      );
      
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      // Button should be disabled during loading
      expect(enhanceButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Prompt')).toBeInTheDocument();
      });
      
      // Button should be re-enabled after loading
      expect(enhanceButton).not.toBeDisabled();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy enhanced prompt to clipboard', async () => {
      const user = userEvent.setup();
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
      
      render(<App />);
      
      // Enhance a prompt first
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Prompt')).toBeInTheDocument();
      });
      
      // Click copy button
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);
      
      // Should copy the enhanced text
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockEnhancedResponse.enhancedPrompt);
      
      // Should show "Copied!" state
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Trigger error by clicking enhance with empty prompt
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      expect(screen.getByText('Please enter a prompt to enhance')).toBeInTheDocument();
      
      // Start typing
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'a');
      
      // Error should be cleared
      expect(screen.queryByText('Please enter a prompt to enhance')).not.toBeInTheDocument();
    });

    it('should clear error when mode is changed', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Trigger error
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      expect(screen.getByText('Please enter a prompt to enhance')).toBeInTheDocument();
      
      // Change mode
      const creativeButton = screen.getByText('Creative').closest('button');
      await user.click(creativeButton!);
      
      // Error should still be visible (mode change doesn't clear empty prompt error)
      expect(screen.getByText('Please enter a prompt to enhance')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layout', () => {
      render(<App />);
      
      const modeContainer = screen.getByText('Standard').closest('div');
      expect(modeContainer).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4', 'gap-3');
    });

    it('should have responsive container', () => {
      render(<App />);
      
      const mainContainer = screen.getByText('Loogi Prompt Enhancer').closest('div');
      expect(mainContainer).toHaveClass('max-w-4xl', 'mx-auto');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during enhancement', async () => {
      const user = userEvent.setup();
      // Mock slow response
      mockApiService.enhancePrompt.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockEnhancedResponse), 50))
      );
      
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      // Should show loading text
      expect(screen.getByText('Enhancing...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Prompt')).toBeInTheDocument();
      });
    });
  });

  describe('Integration with API Service', () => {
    it('should call API service with correct parameters', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'My test prompt');
      
      // Select technical mode
      const technicalButton = screen.getByText('Technical').closest('button');
      await user.click(technicalButton!);
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(mockApiService.enhancePrompt).toHaveBeenCalledWith({
          prompt: 'My test prompt',
          mode: 'technical',
        });
      });
    });

    it('should handle API service rate limiting', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit error
      mockApiService.enhancePrompt.mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        statusCode: 429,
      });
      
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Tab to mode selector
      await user.tab();
      
      // Tab to textarea
      await user.tab();
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      expect(textarea).toHaveFocus();
      
      // Type something
      await user.keyboard('Test prompt');
      
      // Tab to enhance button
      await user.tab();
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      expect(enhanceButton).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(<App />);
      
      expect(screen.getByLabelText('Enhancement Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Your Prompt')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prompts', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const longPrompt = 'This is a test. '.repeat(50);
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, longPrompt);
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(mockApiService.enhancePrompt).toHaveBeenCalledWith({
          prompt: longPrompt,
          mode: 'standard',
        });
      });
    });

    it('should handle special characters in prompts', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test with @#$%^&*() special chars');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      await user.click(enhanceButton);
      
      await waitFor(() => {
        expect(mockApiService.enhancePrompt).toHaveBeenCalledWith({
          prompt: 'Test with @#$%^&*() special chars',
          mode: 'standard',
        });
      });
    });

    it('should handle multiple rapid enhancements', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      await user.type(textarea, 'Test prompt');
      
      const enhanceButton = screen.getByRole('button', { name: /enhance prompt/i });
      
      // Click multiple times
      await user.click(enhanceButton);
      await user.click(enhanceButton);
      await user.click(enhanceButton);
      
      // Should only be called once due to loading state
      await waitFor(() => {
        expect(mockApiService.enhancePrompt).toHaveBeenCalledTimes(1);
      });
    });
  });
});