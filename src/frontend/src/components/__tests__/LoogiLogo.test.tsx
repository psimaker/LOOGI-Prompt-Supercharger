import React from 'react';
import { render } from '@testing-library/react';
import { LoogiLogo } from '../LoogiLogo';

describe('LoogiLogo Component', () => {
  it('renders LOOGI logo with colored letters', () => {
    const { container } = render(<LoogiLogo />);
    
    // Check that all letters are present (use container to avoid duplicate O issue)
    expect(container.textContent).toContain('L');
    expect(container.textContent).toContain('O');
    expect(container.textContent).toContain('G');
    expect(container.textContent).toContain('I');
    
    // Check that "Prompt Supercharger" text is present with enhanced styling
    expect(container.textContent).toContain('Prompt Supercharger');
  });

  it('applies correct color classes to letters', () => {
    const { container } = render(<LoogiLogo />);
    
    // Check that the colored classes are applied
    expect(container.querySelector('.loogi-l')).toBeTruthy();
    expect(container.querySelector('.loogi-o1')).toBeTruthy();
    expect(container.querySelector('.loogi-o2')).toBeTruthy();
    expect(container.querySelector('.loogi-g')).toBeTruthy();
    expect(container.querySelector('.loogi-i')).toBeTruthy();
  });

  it('applies enhanced text shadow and styling to Prompt Supercharger text', () => {
    const { container } = render(<LoogiLogo />);
    
    const textElement = container.querySelector('span[class*="text-black"]') || container.querySelector('span[class*="text-white"]');
    expect(textElement).toBeTruthy();
    
    // Check for enhanced shadow classes
    const textClasses = textElement?.className || '';
    expect(textClasses).toContain('drop-shadow-xl');
    expect(textClasses).toContain('text-shadow-lg');
    expect(textClasses).toContain('antialiased');
    expect(textClasses).toContain('font-extrabold');
  });

  it('hides text when showText is false', () => {
    const { container } = render(<LoogiLogo showText={false} />);
    
    // Letters should still be present
    expect(container.textContent).toContain('L');
    expect(container.textContent).toContain('O');
    expect(container.textContent).toContain('G');
    expect(container.textContent).toContain('I');
    
    // But "Prompt Supercharger" text should not be present
    expect(container.textContent).not.toContain('Prompt Supercharger');
  });

  it('applies custom className', () => {
    const { container } = render(<LoogiLogo className="custom-class" />);
    
    // Check that the custom class is applied to the outer div
    expect(container.firstChild?.classList.contains('custom-class')).toBe(true);
  });
});