import React from 'react';

interface EnhancedOutputProps {
  content: string;
  className?: string;
}

export const EnhancedOutput: React.FC<EnhancedOutputProps> = ({
  content,
  className = ''
}) => {
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 enhanced-output dark:bg-gray-700 dark:border-gray-600 ${className}`}>
      <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-100 leading-relaxed">
        {content}
      </pre>
    </div>
  );
};