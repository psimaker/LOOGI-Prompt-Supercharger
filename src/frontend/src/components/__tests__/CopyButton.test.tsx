import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '../CopyButton';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('CopyButton Component', () => {
  const defaultProps = {
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (navigator.clipboard.writeText as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should render button element', () => {
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should display "Copy" text by default', () => {
      render(<CopyButton {...defaultProps} />);
      
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('should display copy icon', () => {
      render(<CopyButton {...defaultProps} />);
      
      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have proper title attribute', () => {
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Copy to clipboard');
    });

    it('should apply custom className', () => {
      render(<CopyButton {...defaultProps} className="custom-copy-btn" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-copy-btn');
    });
  });

  describe('User Interaction', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('should show "Copied!" state after click', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should show "Copied!" text
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // Should show checkmark icon
      const checkmarkSvg = screen.getByRole('button').querySelector('svg');
      expect(checkmarkSvg).toBeInTheDocument();
    });

    it('should revert to "Copy" state after 2 seconds', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();
      
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should show "Copied!" initially
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // Advance time by 2 seconds
      jest.advanceTimersByTime(2000);
      
      // Should revert to "Copy"
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('should handle multiple rapid clicks', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(defaultProps.onClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Tab to the button
      await user.tab();
      expect(button).toHaveFocus();
      
      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
      
      // Press Space to activate
      await user.keyboard(' ');
      expect(defaultProps.onClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper ARIA attributes', () => {
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Copy to clipboard');
    });

    it('should update title during copied state', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(button).toHaveAttribute('title', 'Copied!');
      });
    });
  });

  describe('Styling', () => {
    it('should have proper button styling', () => {
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
      expect(button).toHaveClass('px-3', 'py-1', 'text-sm');
      expect(button).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(button).toHaveClass('rounded-md', 'hover:bg-blue-200');
      expect(button).toHaveClass('transition-colors');
    });

    it('should maintain styling across state changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-100', 'text-blue-700');
      
      await user.click(button);
      
      // Styling should remain consistent
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
      expect(button).toHaveClass('px-3', 'py-1', 'text-sm');
      expect(button).toHaveClass('rounded-md', 'transition-colors');
    });
  });

  describe('Icons', () => {
    it('should show copy icon by default', () => {
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Should have copy-related path (this is implementation-specific)
      const path = svg.querySelector('path');
      expect(path).toBeInTheDocument();
    });

    it('should show checkmark icon when copied', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Should have checkmark-related path
      const path = svg.querySelector('path');
      expect(path).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle onClick that throws an error', async () => {
      const errorProps = {
        onClick: jest.fn(() => {
          throw new Error('Test error');
        }),
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      render(<CopyButton {...errorProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      // Should still attempt to handle the click
      expect(errorProps.onClick).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle missing clipboard API gracefully', async () => {
      const originalClipboard = navigator.clipboard;
      // @ts-ignore
      delete navigator.clipboard;
      
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should still show copied state
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // Restore clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
      });
    });

    it('should handle very long text content', async () => {
      const user = userEvent.setup();
      const longOnClick = jest.fn();
      
      render(<CopyButton onClick={longOnClick} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(longOnClick).toHaveBeenCalled();
    });
  });

  describe('Props Interface', () => {
    it('should accept all required props', () => {
      const props = {
        onClick: jest.fn(),
        className: 'test-class',
        id: 'test-id',
        'data-testid': 'copy-button',
      };
      
      render(<CopyButton {...props} />);
      
      const button = screen.getByTestId('copy-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('test-class');
      expect(button).toHaveAttribute('id', 'test-id');
    });

    it('should spread additional HTML attributes', () => {
      render(
        <CopyButton 
          onClick={jest.fn()}
          title="Custom title"
          disabled={true}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Custom title');
      expect(button).toBeDisabled();
    });
  });

  describe('State Management', () => {
    it('should manage copied state correctly', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CopyButton {...defaultProps} />);
      
      // Initial state
      expect(screen.getByText('Copy')).toBeInTheDocument();
      
      // Click to copy
      await user.click(screen.getByRole('button'));
      
      // Should show copied state
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // Wait for state to reset
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle multiple rapid clicks correctly', async () => {
      const user = userEvent.setup();
      render(<CopyButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times
      await user.click(button);
      await user.click(button);
      
      // Should show copied state
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // onClick should be called for each click
      expect(defaultProps.onClick).toHaveBeenCalledTimes(2);
    });
  });
});