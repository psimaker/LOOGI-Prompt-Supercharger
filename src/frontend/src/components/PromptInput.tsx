import React, { useEffect, useRef } from 'react';
import './PromptInput.css';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isDarkMode?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter your prompt here...',
  disabled = false,
  className = '',
  isDarkMode = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    autoResize();
  };

  const autoResize = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set new height based on scrollHeight
      textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
    }
  };

  // Auto-resize when value changes programmatically
  useEffect(() => {
    autoResize();
  }, [value]);

  // CSS-Variablen-basiertes Styling wie in Context7 gezeigt
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      
      // Dynamische CSS-Variablen basierend auf Dark-Mode
      container.style.setProperty('--bg-color', isDarkMode ? '#374151' : '#ffffff');
      container.style.setProperty('--text-color', isDarkMode ? '#ffffff' : '#111827');
      container.style.setProperty('--border-color', isDarkMode ? '#4b5563' : '#d1d5db');
      container.style.setProperty('--border-hover-color', isDarkMode ? '#6b7280' : '#9ca3af');
      container.style.setProperty('--placeholder-color', isDarkMode ? '#9ca3af' : '#6b7280');
      
      // Cursor-Variablen explizit setzen
      container.style.setProperty('--cursor-style', 'text');
      container.style.setProperty('--caret-color', '#3b82f6');
      
      // Dark-Klasse basierend auf Context7-Mustern
      if (isDarkMode) {
        container.classList.add('dark');
      } else {
        container.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Browser-Kompatibilitäts-Check wie in Context7 gezeigt
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Explizite Cursor-Kontrolle über JavaScript für maximale Kompatibilität
      const setCursorStyle = () => {
        textarea.style.cursor = 'text';
        textarea.style.caretColor = '#3b82f6';
      };
      
      // Event-Listener für verschiedene Interaktionen
      textarea.addEventListener('mouseenter', setCursorStyle);
      textarea.addEventListener('mousemove', setCursorStyle);
      textarea.addEventListener('mousedown', setCursorStyle);
      textarea.addEventListener('focus', setCursorStyle);
      
      // Cleanup
      return () => {
        textarea.removeEventListener('mouseenter', setCursorStyle);
        textarea.removeEventListener('mousemove', setCursorStyle);
        textarea.removeEventListener('mousedown', setCursorStyle);
        textarea.removeEventListener('focus', setCursorStyle);
      };
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`prompt-input-container w-full ${className}`}
      // CSS-Variablen direkt als Inline-Style wie in Context7 gezeigt
      style={{
        '--cursor-style': 'text',
        '--caret-color': '#3b82f6',
        '--padding-size': '12px',
      } as React.CSSProperties}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 prompt-textarea"
        style={{ minHeight: '120px', maxHeight: '500px', resize: 'none' }}
        maxLength={50000}
        // Direkte Cursor-Attribute für maximale Kompatibilität
        data-cursor="text"
        data-caret-color="#3b82f6"
      />
    </div>
  );
};