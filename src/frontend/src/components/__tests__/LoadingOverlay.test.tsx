import React from 'react';
import { render } from '@testing-library/react';
import { LoadingOverlay } from '../LoadingOverlay';

describe('LoadingOverlay Component', () => {
  it('should not render when isLoading is false', () => {
    const { container } = render(<LoadingOverlay isLoading={false} isDarkMode={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isLoading is true', () => {
    const { getByText, container } = render(<LoadingOverlay isLoading={true} isDarkMode={false} />);
    
    // Check that the overlay is present
    expect(getByText(/Moonwalking/i)).toBeTruthy();
    
    // Check that the loading spinner is present (by checking for the spinner class)
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('should always display Moonwalking text regardless of language', () => {
    // Mock navigator.language to German
    Object.defineProperty(window.navigator, 'language', {
      value: 'de-DE',
      configurable: true
    });
    
    const { getByText } = render(<LoadingOverlay isLoading={true} isDarkMode={false} />);
    
    expect(getByText(/Moonwalking/i)).toBeTruthy();
  });

  it('should apply improved styling with drop shadows', () => {
    const { container } = render(<LoadingOverlay isLoading={true} isDarkMode={false} />);
    
    // Check that the improved text styling is applied
    const textElement = container.querySelector('.text-3xl');
    expect(textElement).toBeTruthy();
    
    // Check that drop shadow classes are applied
    const textContainer = container.querySelector('.drop-shadow-lg');
    expect(textContainer).toBeTruthy();
    
    // Check that the larger spinner is present
    const spinner = container.querySelector('.w-10.h-10');
    expect(spinner).toBeTruthy();
  });
});