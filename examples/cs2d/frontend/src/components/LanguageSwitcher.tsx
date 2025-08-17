import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = availableLanguages.find(l => l.code === language);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
        data-testid="language-switcher"
      >
        <span className="text-lg">{currentLang?.flag}</span>
        <span className="text-sm text-white font-medium">{currentLang?.code.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-48 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
          {availableLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 transition-all ${
                language === lang.code ? 'bg-white/20' : ''
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-white font-medium">{lang.name}</span>
              {language === lang.code && (
                <svg className="w-4 h-4 text-green-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};