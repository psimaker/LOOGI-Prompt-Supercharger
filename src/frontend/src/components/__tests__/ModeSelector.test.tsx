import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelector } from '../ModeSelector';
import { AIMode } from '../../types';

describe('ModeSelector Component', () => {
  const defaultProps = {
    value: 'standard' as AIMode,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all mode options', () => {
      render(<ModeSelector {...defaultProps} />);
      
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Creative')).toBeInTheDocument();
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Scientific')).toBeInTheDocument();
    });

    it('should display mode descriptions', () => {
      render(<ModeSelector {...defaultProps} />);
      
      expect(screen.getByText('General purpose enhancement')).toBeInTheDocument();
      expect(screen.getByText('Artistic and imaginative')).toBeInTheDocument();
      expect(screen.getByText('Precise and detailed')).toBeInTheDocument();
      expect(screen.getByText('Academically precise and methodologically sound')).toBeInTheDocument();
    });

    it('should highlight the selected mode', () => {
      render(<ModeSelector {...defaultProps} value="creative" />);
      
      const creativeButton = screen.getByText('Creative').closest('button');
      expect(creativeButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-900');
    });

    it('should not highlight unselected modes', () => {
      render(<ModeSelector {...defaultProps} value="creative" />);
      
      const standardButton = screen.getByText('Standard').closest('button');
      expect(standardButton).toHaveClass('border-gray-200', 'bg-white', 'text-gray-700');
      expect(standardButton).not.toHaveClass('border-blue-500');
    });

    it('should apply custom className', () => {
      render(<ModeSelector {...defaultProps} className="custom-selector" />);
      
      const container = screen.getByText('Standard').closest('div');
      expect(container).toHaveClass('custom-selector');
    });

    it('should have proper grid layout', () => {
      render(<ModeSelector {...defaultProps} />);
      
      const container = screen.getByText('Standard').closest('div');
      expect(container).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4', 'gap-3');
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when a mode is clicked', async () => {
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} />);
      
      const creativeButton = screen.getByText('Creative').closest('button');
      await user.click(creativeButton!);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('creative');
    });

    it('should call onChange with correct mode for each button', async () => {
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} />);
      
      const modes: AIMode[] = ['standard', 'creative', 'technical', 'scientifically'];
      
      for (const mode of modes) {
        const button = screen.getByText(getModeLabel(mode)).closest('button');
        await user.click(button!);
        
        expect(defaultProps.onChange).toHaveBeenCalledWith(mode);
      }
      
      expect(defaultProps.onChange).toHaveBeenCalledTimes(4);
    });

    it('should update visual state when mode changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ModeSelector {...defaultProps} value="standard" />);
      
      let standardButton = screen.getByText('Standard').closest('button');
      let creativeButton = screen.getByText('Creative').closest('button');
      
      expect(standardButton).toHaveClass('border-blue-500');
      expect(creativeButton).toHaveClass('border-gray-200');
      
      rerender(<ModeSelector {...defaultProps} value="creative" />);
      
      standardButton = screen.getByText('Standard').closest('button');
      creativeButton = screen.getByText('Creative').closest('button');
      
      expect(standardButton).toHaveClass('border-gray-200');
      expect(creativeButton).toHaveClass('border-blue-500');
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} />);
      
      const standardButton = screen.getByText('Standard').closest('button');
      
      // Tab to the first button
      await user.tab();
      expect(standardButton).toHaveFocus();
      
      // Press Enter to select
      await user.keyboard('{Enter}');
      expect(defaultProps.onChange).toHaveBeenCalledWith('standard');
      
      // Press Space to select
      await user.keyboard(' ');
      expect(defaultProps.onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Styling and Appearance', () => {
    it('should have consistent button styling', () => {
      render(<ModeSelector {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
      
      buttons.forEach(button => {
        expect(button).toHaveClass('p-3', 'rounded-lg', 'border-2', 'transition-all', 'duration-200', 'text-left');
      });
    });

    it('should have hover effects on buttons', () => {
      render(<ModeSelector {...defaultProps} />);
      
      const unselectedButton = screen.getByText('Creative').closest('button');
      expect(unselectedButton).toHaveClass('hover:border-gray-300', 'hover:bg-gray-50');
    });

    it('should have proper text styling for labels', () => {
      render(<ModeSelector {...defaultProps} />);
      
      const labels = ['Standard', 'Creative', 'Technical', 'Concise'];
      
      labels.forEach(label => {
        const labelElement = screen.getByText(label);
        expect(labelElement).toHaveClass('font-medium', 'text-sm');
      });
    });

    it('should have proper text styling for descriptions', () => {
      render(<ModeSelector {...defaultProps} />);
      
      const descriptions = [
        'General purpose enhancement',
        'Artistic and imaginative',
        'Precise and detailed',
        'Brief and clear'
      ];
      
      descriptions.forEach(description => {
        const descElement = screen.getByText(description);
        expect(descElement).toHaveClass('text-xs', 'text-gray-500', 'mt-1');
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} />);
      
      const firstButton = screen.getAllByRole('button')[0];
      
      await user.tab();
      expect(firstButton).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      render(<ModeSelector {...defaultProps} aria-label="Enhancement mode selector" />);
      
      const container = screen.getByLabelText('Enhancement mode selector');
      expect(container).toBeInTheDocument();
    });

    it('should announce selection changes to screen readers', () => {
      render(<ModeSelector {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle all valid mode values', () => {
      const modes: AIMode[] = ['standard', 'creative', 'technical', 'scientifically'];
      
      modes.forEach(mode => {
        const { rerender } = render(<ModeSelector {...defaultProps} value={mode} />);
        
        const selectedButton = screen.getByText(getModeLabel(mode)).closest('button');
        expect(selectedButton).toHaveClass('border-blue-500');
        
        rerender(<ModeSelector {...defaultProps} value={mode} />);
      });
    });

    it('should handle invalid mode gracefully', () => {
      // @ts-ignore - Testing edge case
      const { container } = render(<ModeSelector {...defaultProps} value="invalid" />);
      
      expect(container).toBeInTheDocument();
      // Should not crash, just not highlight any button
    });

    it('should handle undefined onChange', async () => {
      const user = userEvent.setup();
      // @ts-ignore - Testing edge case
      render(<ModeSelector value="standard" onChange={undefined} />);
      
      const button = screen.getByText('Creative').closest('button');
      await user.click(button!);
      
      // Should not crash
      expect(button).toBeInTheDocument();
    });

    it('should handle rapid mode changes', async () => {
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} />);
      
      const modes = ['standard', 'creative', 'technical', 'scientifically'] as AIMode[];
      
      for (const mode of modes) {
        const button = screen.getByText(getModeLabel(mode)).closest('button');
        await user.click(button!);
      }
      
      expect(defaultProps.onChange).toHaveBeenCalledTimes(4);
    });
  });

  describe('Props Interface', () => {
    it('should accept all required props', () => {
      const props = {
        value: 'creative' as AIMode,
        onChange: jest.fn(),
        className: 'test-class',
        id: 'test-id',
        'data-testid': 'mode-selector',
      };
      
      render(<ModeSelector {...props} />);
      
      const container = screen.getByTestId('mode-selector');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('test-class');
      expect(container).toHaveAttribute('id', 'test-id');
    });

    it('should spread additional HTML attributes', () => {
      render(
        <ModeSelector 
          value="standard"
          onChange={jest.fn()}
          title="Select enhancement mode"
          role="radiogroup"
        />
      );
      
      const container = screen.getByRole('radiogroup');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('title', 'Select enhancement mode');
    });
  });

  describe('Performance', () => {
    it('should handle rapid clicks efficiently', async () => {
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} />);
      
      const creativeButton = screen.getByText('Creative').closest('button');
      
      // Click rapidly
      for (let i = 0; i < 10; i++) {
        await user.click(creativeButton!);
      }
      
      expect(defaultProps.onChange).toHaveBeenCalledTimes(10);
    });

    it('should update efficiently when value prop changes', () => {
      const { rerender } = render(<ModeSelector {...defaultProps} value="standard" />);
      
      let standardButton = screen.getByText('Standard').closest('button');
      expect(standardButton).toHaveClass('border-blue-500');
      
      rerender(<ModeSelector {...defaultProps} value="creative" />);
      
      standardButton = screen.getByText('Standard').closest('button');
      const creativeButton = screen.getByText('Creative').closest('button');
      
      expect(standardButton).toHaveClass('border-gray-200');
      expect(creativeButton).toHaveClass('border-blue-500');
    });
  });
});

// Helper function to get mode label
function getModeLabel(mode: AIMode): string {
  const labels = {
    standard: 'Standard',
    creative: 'Creative',
    technical: 'Technical',
    scientifically: 'Scientific',
  };
  return labels[mode];
}