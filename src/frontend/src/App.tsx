import React, { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { EnhancedOutput } from './components/EnhancedOutput';
import { ModeSelector } from './components/ModeSelector';
import { CopyButton } from './components/CopyButton';
import { LoadingOverlay } from './components/LoadingOverlay';
import { DarkModeToggle } from './components/DarkModeToggle';
import { GitHubIcon } from './components/GitHubIcon';
import { LoogiLogo } from './components/LoogiLogo';
import { apiService } from './services/api';
import { AIMode } from './types';

function App() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<AIMode>('standard');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Language detection
  const getLocalizedText = () => {
    const locale = navigator.language;
    const isGerman = locale.startsWith('de');
    
    if (isGerman) {
      return {
        tagline: 'Supercharge deine Prompts',
        enhancementMode: 'Verbesserungsmodus',
        yourPrompt: 'Dein Prompt',
        enhancePrompt: 'Supercharge',
        enhancedPrompt: 'Verbesserter Prompt',
        pleaseEnterPrompt: 'Bitte gib einen Prompt ein',
        failedToEnhance: 'Fehler beim Verbessern',
        poweredBy: 'Powered by LOOGI Prompt Supercharger',
        errorOccurred: 'Ein Fehler ist aufgetreten',
        placeholder: 'Gib hier deinen Prompt ein...',
        modes: {
          standard: 'Standard',
          standardDesc: 'Allgemeine Verbesserung',
          creative: 'Kreativ',
          creativeDesc: 'Künstlerisch und fantasievoll',
          technical: 'Technisch',
          technicalDesc: 'Präzise und detailliert',
          scientifically: 'Wissenschaftlich',
          scientificallyDesc: 'Akademisch präzise und methodisch fundiert'
        }
      };
    }
    
    return {
      tagline: 'Supercharge your Prompts',
      enhancementMode: 'Enhancement Mode',
      yourPrompt: 'Your Prompt',
      enhancePrompt: 'Supercharge',
      enhancedPrompt: 'Enhanced Prompt',
      pleaseEnterPrompt: 'Please enter a prompt to enhance',
      failedToEnhance: 'Failed to enhance prompt',
      poweredBy: 'Powered by LOOGI Prompt Supercharger',
      errorOccurred: 'An error occurred',
      placeholder: 'Enter your prompt here...',
      modes: {
        standard: 'Standard',
        standardDesc: 'General purpose enhancement',
        creative: 'Creative',
        creativeDesc: 'Artistic and imaginative',
        technical: 'Technical',
        technicalDesc: 'Precise and detailed',
        scientifically: 'Scientific',
        scientificallyDesc: 'Academically precise and methodologically sound'
      }
    };
  };

  // Dark mode functionality
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Function to set the theme
    const setTheme = (dark: boolean) => {
      setIsDarkMode(dark);
    };
    
    // Initialisierung
    if (savedDarkMode !== null) {
      setTheme(savedDarkMode === 'true');
    } else {
      setTheme(mediaQuery.matches);
    }
    
    // Event listener for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      // Only change automatically if no manual setting is saved
      if (localStorage.getItem('darkMode') === null) {
        setTheme(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleEnhance = async () => {
    const text = getLocalizedText();
    
    if (!prompt.trim()) {
      setError(text.pleaseEnterPrompt);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.enhancePrompt({
        prompt,
        mode,
      });
      setEnhancedPrompt(result.enhancedPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failedToEnhance);
      setEnhancedPrompt('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(enhancedPrompt);
  };

  const text = getLocalizedText();

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    } py-8 px-4 flex flex-col items-center justify-center`}>
      <LoadingOverlay isLoading={isLoading} isDarkMode={isDarkMode} />
      
      {/* Absolute positioned header with brand and toggle separated */}
      <div className="absolute top-6 left-6">
        <LoogiLogo className="text-3xl" isDarkMode={isDarkMode} />
      </div>
      <div className="absolute top-6 right-6">
        <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
      </div>
      
      <div className="w-full max-w-4xl mt-20">
        {/* Tagline with increased spacing and size */}
        <div className="text-center mb-16">
          <h2 className={`text-6xl font-bold ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {text.tagline}
          </h2>
        </div>

        <main className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 text-white' 
            : 'bg-white text-gray-900'
        }`}>
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {text.enhancementMode}
              </label>
              <ModeSelector value={mode} onChange={setMode} localizedText={text.modes} />
            </div>

            <div className="cursor-text-fix">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {text.yourPrompt}
              </label>
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                placeholder={text.placeholder}
                disabled={isLoading}
                isDarkMode={isDarkMode}
              />
            </div>

            <button
              onClick={handleEnhance}
              disabled={isLoading || !prompt.trim()}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                isDarkMode
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:from-gray-600 disabled:to-gray-700 shadow-lg'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl disabled:bg-gray-400 shadow-md'
              } disabled:cursor-not-allowed`}
            >
              {isLoading ? `${text.enhancePrompt}...` : text.enhancePrompt}
            </button>

            {error && (
              <div className={`border px-4 py-3 rounded-lg ${
                isDarkMode 
                  ? 'bg-red-900 border-red-700 text-red-200' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {enhancedPrompt && (
              <div className="fade-in">
                <div className="flex justify-between items-center mb-2">
                  <label className={`block text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {text.enhancedPrompt}
                  </label>
                  <CopyButton onClick={handleCopy} />
                </div>
                <EnhancedOutput content={enhancedPrompt} />
              </div>
            )}
          </div>
        </main>

        <footer className={`text-center mt-8 text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            <p>Powered by <LoogiLogo className="inline-flex" showText={false} isDarkMode={isDarkMode} /></p>
            <GitHubIcon isDarkMode={isDarkMode} className="w-5 h-5" />
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;