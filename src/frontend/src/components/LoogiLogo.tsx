import React from 'react';

interface LoogiLogoProps {
  className?: string;
  showText?: boolean;
  isDarkMode?: boolean;
}

export const LoogiLogo: React.FC<LoogiLogoProps> = ({ className = '', showText = true, isDarkMode }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center text-2xl font-bold">
        <span className="loogi-l">L</span>
        <span className="loogi-o1">O</span>
        <span className="loogi-o2">O</span>
        <span className="loogi-g">G</span>
        <span className="loogi-i">I</span>
      </div>
      {showText && (
        <span className={`ml-2 text-xl font-extrabold 
          ${isDarkMode !== undefined 
            ? (isDarkMode ? 'text-gray-200' : 'text-gray-700')
            : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          Prompt Supercharger
        </span>
      )}
    </div>
  );
};