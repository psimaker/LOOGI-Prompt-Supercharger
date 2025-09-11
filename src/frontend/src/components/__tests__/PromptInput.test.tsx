import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from '../PromptInput';

describe('PromptInput Component', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'Enter your prompt here...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea element', () => {
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should display placeholder text', () => {
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Enter your prompt here...');
      expect(textarea).toBeInTheDocument();
    });

    it('should display provided value', () => {
      render(<PromptInput {...defaultProps} value="Test prompt" />);
      
      const textarea = screen.getByDisplayValue('Test prompt');
      expect(textarea).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<PromptInput {...defaultProps} className="custom-class" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('custom-class');
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when user types', async () => {
      const user = userEvent.setup();
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      
      expect(defaultProps.onChange).toHaveBeenCalledTimes(5); // 'H', 'e', 'l', 'l', 'o'
      expect(defaultProps.onChange).toHaveBeenLastCalledWith('Hello');
    });

    it('should handle paste events', async () => {
      const user = userEvent.setup();
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste('Pasted text');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('Pasted text');
    });

    it('should handle existing text modification', async () => {
      const user = userEvent.setup();
      render(<PromptInput {...defaultProps} value="Initial text" />);
      
      const textarea = screen.getByDisplayValue('Initial text');
      await user.clear(textarea);
      await user.type(textarea, 'New text');
      
      expect(defaultProps.onChange).toHaveBeenLastCalledWith('New text');
    });
  });

  describe('Disabled State', () => {
    it('should disable textarea when disabled prop is true', () => {
      render(<PromptInput {...defaultProps} disabled={true} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      render(<PromptInput {...defaultProps} disabled={true} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Should not work');
      
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should enable textarea when disabled prop is false', () => {
      render(<PromptInput {...defaultProps} disabled={false} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toBeDisabled();
    });
  });

  describe('Textarea Properties', () => {
    it('should have correct number of rows', () => {
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '4');
    });

    it('should have maxLength attribute', () => {
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxlength', '10000');
    });

    it('should be resizable vertically', () => {
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('resize-vertical');
    });

    it('should have proper CSS classes', () => {
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('w-full', 'p-3', 'border', 'border-gray-300', 'rounded-lg');
      expect(textarea).toHaveClass('focus:ring-2', 'focus:ring-blue-500', 'focus:border-transparent');
      expect(textarea).toHaveClass('transition-all', 'duration-200', 'prompt-textarea');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible via keyboard', async () => {
      const user = userEvent.setup();
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Tab to the textarea
      await user.tab();
      expect(textarea).toHaveFocus();
      
      // Type some text
      await user.keyboard('Keyboard input');
      expect(defaultProps.onChange).toHaveBeenCalledWith('Keyboard input');
    });

    it('should have proper ARIA attributes when needed', () => {
      render(<PromptInput {...defaultProps} aria-label="Prompt input field" />);
      
      const textarea = screen.getByLabelText('Prompt input field');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const user = userEvent.setup();
      const longText = 'a'.repeat(1000);
      
      render(<PromptInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, longText);
      
      expect(defaultProps.onChange).toHaveBeenLastCalledWith(longText);
    });

    it('should handle empty string value', () => {
      render(<PromptInput {...defaultProps} value="" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
    });

    it('should handle undefined placeholder', () => {
      render(<PromptInput {...defaultProps} placeholder={undefined} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', '');
    });

    it('should handle custom placeholder', () => {
      render(<PromptInput {...defaultProps} placeholder="Custom placeholder" />);
      
      const textarea = screen.getByPlaceholderText('Custom placeholder');
      expect(textarea).toBeInTheDocument();
    });
  });
});