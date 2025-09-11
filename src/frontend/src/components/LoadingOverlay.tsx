import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  isDarkMode: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, isDarkMode }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-custom"></div>
      <div className={`relative z-10 text-center ${
        isDarkMode ? 'text-white drop-shadow-lg' : 'text-gray-900 drop-shadow-lg'
      }`}>
        <div className="text-3xl font-bold mb-6 animate-pulse drop-shadow-md">
          Moonwalking
          <span className="loading-dots"></span>
        </div>
        <div className="flex justify-center">
          <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin drop-shadow-md"></div>
        </div>
      </div>
    </div>
  );
};