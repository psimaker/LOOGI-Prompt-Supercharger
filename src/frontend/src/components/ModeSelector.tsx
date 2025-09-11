import React from 'react';
import { AIMode } from '../types';

interface ModeSelectorProps {
  value: AIMode;
  onChange: (mode: AIMode) => void;
  className?: string;
  localizedText?: {
    standard: string;
    standardDesc: string;
    creative: string;
    creativeDesc: string;
    technical: string;
    technicalDesc: string;
    scientifically: string;
    scientificallyDesc: string;
  };
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  value,
  onChange,
  className = '',
  localizedText
}) => {
  const modes = localizedText ? [
    { value: 'standard' as AIMode, label: localizedText.standard, description: localizedText.standardDesc },
    { value: 'creative' as AIMode, label: localizedText.creative, description: localizedText.creativeDesc },
    { value: 'technical' as AIMode, label: localizedText.technical, description: localizedText.technicalDesc },
    { value: 'scientifically' as AIMode, label: localizedText.scientifically, description: localizedText.scientificallyDesc },
  ] : [
    { value: 'standard' as AIMode, label: 'Standard', description: 'General purpose enhancement' },
    { value: 'creative' as AIMode, label: 'Creative', description: 'Artistic and imaginative' },
    { value: 'technical' as AIMode, label: 'Technical', description: 'Precise and detailed' },
    { value: 'scientifically' as AIMode, label: 'Scientific', description: 'Academically precise and methodologically sound' },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
            value === mode.value
              ? 'border-blue-500 bg-blue-50 text-blue-900'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="font-medium text-sm">{mode.label}</div>
          <div className="text-xs text-gray-500 mt-1">{mode.description}</div>
        </button>
      ))}
    </div>
  );
};