import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedOutput } from '../EnhancedOutput';

describe('EnhancedOutput Component', () => {
  const sampleContent = `This is an enhanced prompt that provides more detail and context.
It includes specific requirements and clear objectives.
The prompt is structured to elicit the best possible response.`;

  describe('Rendering', () => {
    it('should render with provided content', () => {
      render(<EnhancedOutput content={sampleContent} />);
      
      const preElement = screen.getByText(sampleContent);
      expect(preElement).toBeInTheDocument();
      expect(preElement.tagName).toBe('PRE');
    });

    it('should render empty content', () => {
      render(<EnhancedOutput content="" />);
      
      const preElement = screen.getByRole('article');
      expect(preElement).toBeInTheDocument();
      expect(preElement.textContent).toBe('');
    });

    it('should apply custom className', () => {
      render(<EnhancedOutput content={sampleContent} className="custom-output" />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveClass('custom-output');
    });

    it('should have default CSS classes', () => {
      render(<EnhancedOutput content={sampleContent} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveClass('bg-gray-50', 'border', 'border-gray-200', 'rounded-lg', 'p-4');
      expect(container).toHaveClass('max-h-96', 'overflow-y-auto', 'enhanced-output');
    });
  });

  describe('Content Formatting', () => {
    it('should preserve line breaks', () => {
      const multiLineContent = `First line
Second line
Third line`;
      
      render(<EnhancedOutput content={multiLineContent} />);
      
      const preElement = screen.getByRole('article');
      expect(preElement.textContent).toContain('First line');
      expect(preElement.textContent).toContain('Second line');
      expect(preElement.textContent).toContain('Third line');
    });

    it('should preserve whitespace formatting', () => {
      const formattedContent = `    Indented text
  Less indented
Normal text`;
      
      render(<EnhancedOutput content={formattedContent} />);
      
      const preElement = screen.getByRole('article');
      expect(preElement).toHaveClass('whitespace-pre-wrap');
    });

    it('should handle very long words with word wrapping', () => {
      const longWord = 'verylongword'.repeat(20);
      
      render(<EnhancedOutput content={longWord} />);
      
      const preElement = screen.getByRole('article');
      expect(preElement).toHaveClass('word-wrap', 'break-word');
    });

    it('should handle special characters', () => {
      const specialContent = 'Special chars: @#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      
      render(<EnhancedOutput content={specialContent} />);
      
      const preElement = screen.getByText(specialContent);
      expect(preElement).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have proper font styling', () => {
      render(<EnhancedOutput content={sampleContent} />);
      
      const preElement = screen.getByRole('article');
      expect(preElement).toHaveClass('font-sans', 'text-gray-800', 'leading-relaxed');
    });

    it('should have scrollable container for long content', () => {
      const longContent = 'Line\n'.repeat(100);
      
      render(<EnhancedOutput content={longContent} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveClass('max-h-96', 'overflow-y-auto');
    });

    it('should maintain consistent styling with different content lengths', () => {
      const contents = [
        'Short',
        'Medium length content here',
        'This is a much longer piece of content that should still maintain the same styling properties as shorter content'
      ];

      contents.forEach(content => {
        const { rerender } = render(<EnhancedOutput content={content} />);
        
        const container = screen.getByRole('article');
        expect(container).toHaveClass('bg-gray-50', 'border', 'border-gray-200', 'rounded-lg', 'p-4');
        
        rerender(<EnhancedOutput content={content} />);
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible via screen reader', () => {
      render(<EnhancedOutput content={sampleContent} />);
      
      const preElement = screen.getByRole('article');
      expect(preElement).toBeInTheDocument();
    });

    it('should handle ARIA attributes', () => {
      render(
        <EnhancedOutput 
          content={sampleContent} 
          aria-label="Enhanced prompt output"
        />
      );
      
      const preElement = screen.getByLabelText('Enhanced prompt output');
      expect(preElement).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<EnhancedOutput content={sampleContent} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      
      // Should be focusable
      container.focus();
      expect(document.activeElement).toBe(container);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null content gracefully', () => {
      // @ts-ignore - Testing edge case
      render(<EnhancedOutput content={null} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('null');
    });

    it('should handle undefined content gracefully', () => {
      // @ts-ignore - Testing edge case
      render(<EnhancedOutput content={undefined} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('');
    });

    it('should handle numeric content', () => {
      // @ts-ignore - Testing edge case
      render(<EnhancedOutput content={12345} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('12345');
    });

    it('should handle boolean content', () => {
      // @ts-ignore - Testing edge case
      render(<EnhancedOutput content={true} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('true');
    });

    it('should handle content with only whitespace', () => {
      const whitespaceContent = '   \n\t  \n   ';
      
      render(<EnhancedOutput content={whitespaceContent} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe(whitespaceContent);
    });

    it('should handle Unicode characters', () => {
      const unicodeContent = 'Hello 世界 🌍 مرحبا';
      
      render(<EnhancedOutput content={unicodeContent} />);
      
      const container = screen.getByText(unicodeContent);
      expect(container).toBeInTheDocument();
    });

    it('should handle HTML-like content safely', () => {
      const htmlContent = '<script>alert("XSS")</script>';
      
      render(<EnhancedOutput content={htmlContent} />);
      
      const container = screen.getByRole('article');
      expect(container.textContent).toBe(htmlContent);
      expect(container.innerHTML).toContain('&lt;script&gt;'); // Should be escaped
    });
  });

  describe('Performance', () => {
    it('should handle very long content efficiently', () => {
      const veryLongContent = 'A'.repeat(10000);
      
      const { container } = render(<EnhancedOutput content={veryLongContent} />);
      
      const outputElement = screen.getByRole('article');
      expect(outputElement).toBeInTheDocument();
      expect(outputElement.textContent).toBe(veryLongContent);
    });

    it('should update content efficiently', () => {
      const { rerender } = render(<EnhancedOutput content="Initial content" />);
      
      let outputElement = screen.getByRole('article');
      expect(outputElement.textContent).toBe('Initial content');
      
      rerender(<EnhancedOutput content="Updated content" />);
      
      outputElement = screen.getByRole('article');
      expect(outputElement.textContent).toBe('Updated content');
    });
  });

  describe('Props Interface', () => {
    it('should accept all required props', () => {
      const props = {
        content: 'Test content',
        className: 'test-class',
        'aria-label': 'Test output',
        id: 'test-id',
      };
      
      render(<EnhancedOutput {...props} />);
      
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('test-class');
      expect(container).toHaveAttribute('id', 'test-id');
    });

    it('should spread additional HTML attributes', () => {
      render(
        <EnhancedOutput 
          content="Test content"
          data-testid="enhanced-output"
          title="Enhanced prompt output"
        />
      );
      
      const container = screen.getByTestId('enhanced-output');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('title', 'Enhanced prompt output');
    });
  });
});